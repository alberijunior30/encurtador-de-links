import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { getInitialTheme, THEME_KEY } from '../theme.js';
import { MOCK_USERS_KEY } from '../api/mock.js';

// matchMedia falso: `dark` define a preferência do sistema; setDark() simula a mudança.
// setDark() chama os listeners de forma síncrona (como o navegador faria); nos testes ele é
// envolvido em act() porque o listener atualiza o estado do ThemeToggle.
function mockMatchMedia(dark) {
  const listeners = new Set();
  const mq = {
    get matches() {
      return dark;
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
  };
  window.matchMedia = vi.fn(() => mq);
  return {
    setDark(value) {
      dark = value;
      listeners.forEach((fn) => fn({ matches: value }));
    },
    listenerCount: () => listeners.size,
  };
}

const htmlTheme = () => document.documentElement.getAttribute('data-theme');

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tema dark/light', () => {
  test('sem tema salvo segue matchMedia: dark', () => {
    mockMatchMedia(true);
    expect(getInitialTheme()).toBe('dark');
    render(<ThemeToggle />);
    expect(htmlTheme()).toBe('dark');
    expect(screen.getByRole('button', { name: 'Ativar tema claro' })).toBeInTheDocument();
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  test('sem tema salvo segue matchMedia: light', () => {
    mockMatchMedia(false);
    render(<ThemeToggle />);
    expect(htmlTheme()).toBe('light');
    expect(screen.getByRole('button', { name: 'Ativar tema escuro' })).toBeInTheDocument();
  });

  test('sem matchMedia -> light', () => {
    expect(window.matchMedia).toBeUndefined();
    render(<ThemeToggle />);
    expect(htmlTheme()).toBe('light');
  });

  test('não grava no localStorage só por abrir a página', () => {
    mockMatchMedia(true);
    render(<ThemeToggle />);
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  test('clicar alterna o data-theme, o rótulo e grava no localStorage', async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Ativar tema escuro' }));
    expect(htmlTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Ativar tema claro' }));
    expect(htmlTheme()).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  test('tema salvo é restaurado ao recarregar (desmontar/montar), mesmo contra o sistema', async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    const { unmount } = render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: 'Ativar tema escuro' }));
    unmount();
    document.documentElement.removeAttribute('data-theme');

    render(<ThemeToggle />);
    expect(htmlTheme()).toBe('dark');
    expect(screen.getByRole('button', { name: 'Ativar tema claro' })).toBeInTheDocument();
  });

  test.each(['blue', 'DARK', '', 'null'])('valor inválido %j no localStorage cai no padrão do sistema', (value) => {
    localStorage.setItem(THEME_KEY, value);
    mockMatchMedia(true);
    render(<ThemeToggle />);
    expect(htmlTheme()).toBe('dark');
  });

  test('sem escolha, acompanha mudanças do sistema; depois do clique, não', async () => {
    const system = mockMatchMedia(false);
    const user = userEvent.setup();
    render(<ThemeToggle />);
    expect(htmlTheme()).toBe('light');

    expect(system.listenerCount()).toBe(1);
    act(() => system.setDark(true));
    expect(htmlTheme()).toBe('dark');
    expect(screen.getByRole('button', { name: 'Ativar tema claro' })).toBeInTheDocument();
    expect(localStorage.getItem(THEME_KEY)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Ativar tema claro' }));
    expect(htmlTheme()).toBe('light');
    expect(system.listenerCount()).toBe(0);
    act(() => system.setDark(true));
    expect(htmlTheme()).toBe('light');
  });

  test('o botão aparece na App e o tema não faz nenhuma chamada a fetch', async () => {
    mockMatchMedia(false);
    localStorage.setItem(
      MOCK_USERS_KEY,
      JSON.stringify([{ id: 1, name: 'Ana', avatar: 'cat', createdAt: '2026-11-23T18:00:00.000Z' }]),
    );
    const user = userEvent.setup();
    render(<App />);
    // espera o carregamento assíncrono de usuários terminar dentro do teste
    await screen.findByText('Ana');
    await user.click(screen.getByRole('button', { name: 'Ativar tema escuro' }));
    await user.click(screen.getByRole('button', { name: 'Ativar tema claro' }));
    render(<ThemeToggle />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('script inline do index.html (antes da primeira pintura)', () => {
  const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
  const inline = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const run = () => new Function(inline)();

  test.each([
    ['dark', false, 'dark'],
    ['light', true, 'light'],
    ['blue', true, 'dark'],
    [null, false, 'light'],
  ])('salvo %j, sistema dark=%j -> %j (mesma regra de theme.js)', (saved, systemDark, expected) => {
    if (saved !== null) localStorage.setItem(THEME_KEY, saved);
    mockMatchMedia(systemDark);
    run();
    expect(htmlTheme()).toBe(expected);
    expect(getInitialTheme()).toBe(expected);
  });

  test('sem matchMedia -> light', () => {
    run();
    expect(htmlTheme()).toBe('light');
  });
});
