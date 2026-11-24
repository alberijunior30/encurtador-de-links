// Fluxo completo com a implementação REAL (fetch mockado):
// activeUserId "1" no localStorage -> corpo enviado com "userId": 1 (number).
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { ACTIVE_USER_KEY, toUserId } from '../activeUser.js';

vi.mock('../api/index.js', async () => import('../api/http.js'));

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe('conversão do userId', () => {
  test.each([
    ['1', 1],
    ['42', 42],
    ['1.5', null],
    ['abc', null],
    ['', null],
    [null, null],
    // texto: só dígitos; zeros à esquerda valem
    ['01', 1],
    ['007', 7],
    [' 1 ', null],
    [' 1', null],
    ['1 ', null],
    ['+1', null],
    ['-1', null],
    ['1.0', null],
    ['1e3', null],
    ['0x10', null],
    ['0', null],
    ['00', null],
    ['9007199254740991', 9007199254740991],
    ['9007199254740992', null],
    ['9007199254740993', null],
    // número: só inteiro seguro e positivo
    [1, 1],
    [42, 42],
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    [Number.MAX_SAFE_INTEGER + 1, null],
    [0, null],
    [-0, null],
    [-1, null],
    [1.5, null],
    [NaN, null],
    [Infinity, null],
    // outros tipos
    [undefined, null],
    [true, null],
    [[1], null],
    [{}, null],
  ])('toUserId(%j) -> %j', (raw, expected) => {
    expect(toUserId(raw)).toBe(expected);
  });

  test('com activeUserId = "1" no localStorage, o fetch recebe "userId": 1 (number)', async () => {
    localStorage.setItem(ACTIVE_USER_KEY, '1');
    expect(localStorage.getItem(ACTIVE_USER_KEY)).toBe('1');

    const fetchMock = vi.fn(async (url, options = {}) => {
      if (url.endsWith('/users') && !options.method) {
        return jsonResponse(200, [{ id: 1, name: 'Ana', avatar: 'cat', createdAt: '2026-11-23T18:00:00.000Z' }]);
      }
      if (url.endsWith('/links') && !options.method) return jsonResponse(200, []);
      const body = JSON.parse(options.body);
      return jsonResponse(201, {
        id: 1,
        code: 'aB3xK9',
        shortUrl: 'http://localhost:3000/aB3xK9',
        originalUrl: body.url,
        userId: body.userId,
        createdAt: '2026-11-23T19:00:00.000Z',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Ana');
    await user.type(screen.getByLabelText('URL'), 'https://exemplo.com');
    await user.click(screen.getByRole('button', { name: 'Encurtar' }));
    await screen.findAllByRole('link', { name: 'http://localhost:3000/aB3xK9' });

    const call = fetchMock.mock.calls.find(([url]) => url === 'http://localhost:3000/api/links');
    expect(call).toBeTruthy();
    expect(call[1].body).toContain('"userId":1');
    expect(call[1].body).not.toContain('"userId":"1"');
    expect(typeof JSON.parse(call[1].body).userId).toBe('number');
  });
});
