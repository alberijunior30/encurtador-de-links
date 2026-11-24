import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { guardFetch, takeUnmockedCalls } from '../test/fetchGuard.js';

const NETWORK_ERROR = 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

// Importa src/api/index.js de novo com o VITE_USE_MOCK informado.
async function loadApi(value) {
  vi.stubEnv('VITE_USE_MOCK', value);
  vi.resetModules();
  return import('../api/index.js');
}

describe('modo da camada de API', () => {
  test('a suíte roda com a simulação (test.env VITE_USE_MOCK=true)', async () => {
    const api = await import('../api/index.js');
    expect(import.meta.env.VITE_USE_MOCK).toBe('true');
    expect(api.USE_MOCK).toBe(true);
  });

  test('shouldUseMock: só "true" liga a simulação', async () => {
    const { shouldUseMock } = await import('../api/index.js');
    expect(shouldUseMock(undefined)).toBe(false);
    expect(shouldUseMock('false')).toBe(false);
    expect(shouldUseMock('')).toBe(false);
    expect(shouldUseMock('1')).toBe(false);
    expect(shouldUseMock('true')).toBe(true);
  });

  test('sem VITE_USE_MOCK -> API real (usa fetch em http://localhost:3000/api)', async () => {
    const api = await loadApi(undefined);
    expect(import.meta.env.VITE_USE_MOCK).toBeUndefined();
    expect(api.USE_MOCK).toBe(false);

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.listUsers()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/users', expect.any(Object));
  });

  test('com VITE_USE_MOCK=true -> simulação (sem fetch)', async () => {
    const api = await loadApi('true');
    expect(api.USE_MOCK).toBe(true);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = await api.createUser({ name: 'Ana', avatar: 'cat' });
    await expect(api.listUsers()).resolves.toEqual([user]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('API real com backend fora do ar: a tela mostra a falha de rede e não quebra', async () => {
    await loadApi(undefined);
    const { default: App } = await import('../App.jsx');
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(NETWORK_ERROR);
    expect(screen.getByRole('heading', { name: 'Encurtador de Links' })).toBeInTheDocument();

    // criar usuário também mostra a mensagem, sem quebrar a tela
    await user.type(screen.getByLabelText('Nome'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'cat' }));
    await user.click(screen.getByRole('button', { name: 'Criar' }));
    const form = screen.getByRole('button', { name: 'Criar' }).closest('form');
    expect(await within(form).findByRole('alert')).toHaveTextContent(NETWORK_ERROR);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:3000/api/users',
      'http://localhost:3000/api/users',
    ]);
  });
});

describe('guarda contra fetch não mockado', () => {
  test('o fetch padrão dos testes é a guarda: bloqueia e registra a chamada', async () => {
    expect(globalThis.fetch).toBe(guardFetch);
    await expect(fetch('http://localhost:3000/api/users')).rejects.toThrow(/bloqueado/);
    // consome o registro para este teste (de propósito) não falhar no afterEach
    expect(takeUnmockedCalls()).toEqual(['http://localhost:3000/api/users']);
  });

  test('depois de vi.unstubAllGlobals o fetch volta a ser a guarda', () => {
    vi.stubGlobal('fetch', vi.fn());
    vi.unstubAllGlobals();
    expect(globalThis.fetch).toBe(guardFetch);
  });
});
