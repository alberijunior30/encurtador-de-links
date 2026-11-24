import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { listUserLinks as mockList, MOCK_LINKS_KEY, MOCK_USERS_KEY } from '../api/mock.js';
import { listUserLinks as httpList } from '../api/http.js';
import { listUserLinks as indexList } from '../api/index.js';
import { getActiveUserId, ACTIVE_USER_KEY } from '../activeUser.js';

// Mensagem copiada literalmente de API.md (GET /api/users/:id/links, tabela "Erros").
const NOT_FOUND = { error: 'Usuário não encontrado' };

const link = (id, userId, createdAt) => ({
  id,
  code: `Code${String(id).padStart(2, '0')}`,
  shortUrl: `http://localhost:3000/Code${String(id).padStart(2, '0')}`,
  originalUrl: `https://exemplo.com/${id}`,
  userId,
  createdAt,
});

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe('simulação de GET /api/users/:id/links', () => {
  beforeEach(() => {
    localStorage.setItem(
      MOCK_USERS_KEY,
      JSON.stringify([
        { id: 1, name: 'Ana', avatar: 'cat', createdAt: '2026-11-23T18:00:00.000Z' },
        { id: 2, name: 'Bruno', avatar: 'dog', createdAt: '2026-11-23T18:01:00.000Z' },
        { id: 3, name: 'Carla', avatar: 'star', createdAt: '2026-11-23T18:02:00.000Z' },
      ]),
    );
    localStorage.setItem(
      MOCK_LINKS_KEY,
      JSON.stringify([
        link(1, 1, '2026-11-23T19:00:00.000Z'),
        link(2, 2, '2026-11-23T19:05:00.000Z'),
        link(3, 1, '2026-11-23T19:10:00.000Z'),
        link(4, 1, '2026-11-23T19:10:00.000Z'), // empate com o 3
        { ...link(5, 1, '2026-11-23T18:30:00.000Z'), extra: 'não deve sair' },
      ]),
    );
  });

  test('formato exato de cada item', async () => {
    const list = await mockList(1);
    for (const item of list) {
      expect(Object.keys(item).sort()).toEqual(['code', 'createdAt', 'id', 'originalUrl', 'shortUrl', 'userId']);
    }
  });

  test('só os links do usuário pedido (isolamento)', async () => {
    expect((await mockList(1)).every((l) => l.userId === 1)).toBe(true);
    expect((await mockList(2)).map((l) => l.id)).toEqual([2]);
  });

  test('mais recente primeiro, empate de createdAt -> id maior primeiro', async () => {
    expect((await mockList(1)).map((l) => l.id)).toEqual([4, 3, 1, 5]);
  });

  test('[] para usuário sem links', async () => {
    expect(await mockList(3)).toEqual([]);
  });

  test.each([99, 0, -1, 1.5, 'abc', null])('404 para usuário inexistente/inválido %j', async (id) => {
    await expect(mockList(id)).rejects.toEqual(NOT_FOUND);
  });

  test('aceita o id como string "1" (passa por toUserId)', async () => {
    expect((await mockList('1')).map((l) => l.id)).toEqual([4, 3, 1, 5]);
  });
});

describe('http.listUserLinks', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('faz GET http://localhost:3000/api/users/1/links (sem /api/api)', async () => {
    const list = [link(1, 1, '2026-11-23T19:00:00.000Z')];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, list));
    vi.stubGlobal('fetch', fetchMock);
    await expect(httpList(1)).resolves.toEqual(list);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/users/1/links');
    expect(options.method).toBeUndefined();
  });

  test('rejeita com { error } em 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, NOT_FOUND)));
    await expect(httpList(99)).rejects.toEqual(NOT_FOUND);
  });

  test('com activeUserId = "1" no localStorage a URL usa 1', async () => {
    localStorage.setItem(ACTIVE_USER_KEY, '1');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);
    await httpList(localStorage.getItem(ACTIVE_USER_KEY));
    await httpList(getActiveUserId());
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:3000/api/users/1/links',
      'http://localhost:3000/api/users/1/links',
    ]);
  });

  test('id inválido não faz requisição e rejeita com o 404 do contrato', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(httpList('abc')).rejects.toEqual(NOT_FOUND);
    await expect(httpList(null)).rejects.toEqual(NOT_FOUND);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('src/api/index.js', () => {
  test('exporta listUserLinks', () => {
    expect(typeof indexList).toBe('function');
  });
});
