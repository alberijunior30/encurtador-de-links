import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { MOCK_LINKS_KEY, MOCK_USERS_KEY } from '../api/mock.js';
import { ACTIVE_USER_KEY } from '../activeUser.js';

function seed({ active } = {}) {
  localStorage.setItem(
    MOCK_USERS_KEY,
    JSON.stringify([{ id: 1, name: 'Ana', avatar: 'cat', createdAt: '2026-11-23T18:00:00.000Z' }]),
  );
  if (active !== undefined) localStorage.setItem(ACTIVE_USER_KEY, active);
}

const form = () => screen.getByRole('form', { name: 'Encurtar link' });

describe('tela de encurtar link', () => {
  test('sem usuário ativo fica bloqueada e mostra aviso', async () => {
    seed();
    render(<App />);
    await screen.findByText('Ana');
    const f = within(form());
    expect(f.getByText('Crie ou escolha um usuário para encurtar links.')).toBeInTheDocument();
    expect(f.getByLabelText('URL')).toBeDisabled();
    expect(f.getByRole('button', { name: 'Encurtar' })).toBeDisabled();
  });

  test('habilita ao escolher um usuário', async () => {
    seed();
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Ana/ }));
    const f = within(form());
    expect(f.getByLabelText('URL')).toBeEnabled();
    expect(f.queryByText('Crie ou escolha um usuário para encurtar links.')).not.toBeInTheDocument();
  });

  test('encurtar mostra o link curto clicável em nova aba e limpa o campo', async () => {
    seed({ active: '1' });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Ana');
    const f = within(form());
    const input = f.getByLabelText('URL');
    await user.type(input, 'https://www.exemplo.com/um/caminho/muito/longo');
    await user.click(f.getByRole('button', { name: 'Encurtar' }));

    const link = await f.findByRole('link');
    expect(link.getAttribute('href')).toMatch(/^http:\/\/localhost:3000\/[A-Za-z0-9]{6}$/);
    expect(link).toHaveTextContent(link.getAttribute('href'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(input).toHaveValue('');

    const stored = JSON.parse(localStorage.getItem(MOCK_LINKS_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0].userId).toBe(1);
    expect(stored[0].shortUrl).toBe(link.getAttribute('href'));
  });

  test('URL inválida mostra o erro com role=alert e não cria link', async () => {
    seed({ active: '1' });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Ana');
    const f = within(form());
    await user.type(f.getByLabelText('URL'), 'www.exemplo.com');
    await user.click(f.getByRole('button', { name: 'Encurtar' }));

    expect(await f.findByRole('alert')).toHaveTextContent(
      'URL inválida. Use um endereço começando com http:// ou https://',
    );
    expect(f.getByLabelText('URL')).toHaveValue('www.exemplo.com');
    expect(f.queryByRole('link')).not.toBeInTheDocument();
    expect(localStorage.getItem(MOCK_LINKS_KEY)).toBeNull();
  });

  test('erro vindo da camada de API aparece na tela', async () => {
    seed({ active: '1' });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Ana');
    // o usuário some do "backend" depois de carregado
    localStorage.setItem(MOCK_USERS_KEY, '[]');
    const f = within(form());
    await user.type(f.getByLabelText('URL'), 'https://exemplo.com');
    await user.click(f.getByRole('button', { name: 'Encurtar' }));
    expect(await f.findByRole('alert')).toHaveTextContent('Usuário não encontrado');
  });
});
