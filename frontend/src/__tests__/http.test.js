import { afterEach, describe, expect, test, vi } from 'vitest';
import { API_BASE_URL, createUser, listUsers } from '../api/http.js';

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cabeçalho Content-Type', () => {
  test('GET sai sem o cabeçalho', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);
    await listUsers();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/users');
    expect(options?.method).toBeUndefined();
    expect(options?.headers).toBeUndefined();
    expect(new Headers(options?.headers).has('Content-Type')).toBe(false);
  });

  test('POST sai com Content-Type: application/json', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(201, { id: 1, name: 'Ana', avatar: 'cat', createdAt: '2026-11-23T18:55:00.000Z' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await createUser({ name: 'Ana', avatar: 'cat' });
    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(new Headers(options.headers).get('Content-Type')).toBe('application/json');
  });
});

describe('implementação real (fetch)', () => {
  test('usa a base http://localhost:3000/api', () => {
    expect(API_BASE_URL).toBe('http://localhost:3000/api');
  });

  test('createUser faz POST /api/users e devolve o corpo', async () => {
    const user = { id: 1, name: 'Alberi', avatar: 'rocket', createdAt: '2026-11-23T18:55:00.000Z' };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, user));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createUser({ name: 'Alberi', avatar: 'rocket' })).resolves.toEqual(user);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/users');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ name: 'Alberi', avatar: 'rocket' });
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  test('rejeita com { error } em resposta 400', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { error: 'O nome não pode ficar vazio' })));
    await expect(createUser({ name: '', avatar: 'cat' })).rejects.toEqual({ error: 'O nome não pode ficar vazio' });
  });

  test('rejeita com { error } em 5xx sem corpo JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new SyntaxError('x'); } }),
    );
    const err = await listUsers().catch((e) => e);
    expect(typeof err.error).toBe('string');
    expect(err.error).toContain('500');
  });

  test('rejeita com { error } em português em falha de rede', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(listUsers()).rejects.toEqual({
      error: 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.',
    });
  });

  test('listUsers faz GET /api/users', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);
    await expect(listUsers()).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/api/users');
  });
});
