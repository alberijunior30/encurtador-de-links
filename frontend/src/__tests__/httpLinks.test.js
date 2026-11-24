import { afterEach, describe, expect, test, vi } from 'vitest';
import { createLink } from '../api/http.js';

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('http.createLink', () => {
  test('faz POST http://localhost:3000/api/links (sem /api/api) com JSON', async () => {
    const link = {
      id: 10,
      code: 'aB3xK9',
      shortUrl: 'http://localhost:3000/aB3xK9',
      originalUrl: 'https://exemplo.com',
      userId: 1,
      createdAt: '2026-11-23T19:00:00.000Z',
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, link));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createLink({ userId: 1, url: 'https://exemplo.com' })).resolves.toEqual(link);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/links');
    expect(url).not.toContain('/api/api');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ userId: 1, url: 'https://exemplo.com' });
  });

  test('rejeita com { error } em 400', async () => {
    const error = 'URL inválida. Use um endereço começando com http:// ou https://';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { error })));
    await expect(createLink({ userId: 1, url: 'x' })).rejects.toEqual({ error });
  });

  test('rejeita com { error } em 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, { error: 'Usuário não encontrado' })));
    await expect(createLink({ userId: 99, url: 'https://exemplo.com' })).rejects.toEqual({
      error: 'Usuário não encontrado',
    });
  });
});
