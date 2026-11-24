import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import * as mock from '../api/mock.js';
import { MOCK_LINKS_KEY, MOCK_USERS_KEY } from '../api/mock.js';
import { ACTIVE_USER_KEY } from '../activeUser.js';

const users = [
  { id: 1, name: 'Ana', avatar: 'cat', createdAt: '2026-11-23T18:00:00.000Z' },
  { id: 2, name: 'Bruno', avatar: 'dog', createdAt: '2026-11-23T18:01:00.000Z' },
];
const link = (id, userId, createdAt) => ({
  id,
  code: `Code0${id}`,
  shortUrl: `http://localhost:3000/Code0${id}`,
  originalUrl: `https://exemplo.com/pagina-${id}`,
  userId,
  createdAt,
});

function seed({ active, links = [] } = {}) {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  localStorage.setItem(MOCK_LINKS_KEY, JSON.stringify(links));
  if (active !== undefined) localStorage.setItem(ACTIVE_USER_KEY, active);
}

const history = () => within(screen.getByRole('region', { name: 'Histórico' }));
const items = () => history().getAllByRole('listitem');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('tela de histórico', () => {
  test('sem usuário ativo mostra aviso', async () => {
    seed();
    render(<App />);
    await screen.findByText('Ana');
    expect(history().getByText('Escolha um usuário para ver o histórico.')).toBeInTheDocument();
    expect(history().queryByRole('list')).not.toBeInTheDocument();
  });

  test('lista na ordem certa com URL original, link curto e data', async () => {
    seed({
      active: '1',
      links: [
        link(1, 1, '2026-11-23T19:00:00.000Z'),
        link(2, 1, '2026-11-23T20:30:00.000Z'),
        link(3, 2, '2026-11-23T21:00:00.000Z'),
      ],
    });
    render(<App />);
    await history().findByText('https://exemplo.com/pagina-2');

    const list = items();
    expect(list).toHaveLength(2);
    const first = within(list[0]);
    expect(first.getByText('https://exemplo.com/pagina-2')).toBeInTheDocument();
    const a = first.getByRole('link', { name: 'http://localhost:3000/Code02' });
    expect(a).toHaveAttribute('href', 'http://localhost:3000/Code02');
    expect(a).toHaveAttribute('target', '_blank');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    expect(first.getByText('23/11/2026, 17:30')).toBeInTheDocument();
    expect(within(list[1]).getByText('https://exemplo.com/pagina-1')).toBeInTheDocument();
    expect(within(list[1]).getByText('23/11/2026, 16:00')).toBeInTheDocument();
  });

  test('trocar de usuário troca a lista', async () => {
    seed({
      active: '1',
      links: [link(1, 1, '2026-11-23T19:00:00.000Z'), link(2, 2, '2026-11-23T19:05:00.000Z')],
    });
    const user = userEvent.setup();
    render(<App />);
    await history().findByText('https://exemplo.com/pagina-1');

    await user.click(screen.getByRole('button', { name: /Bruno/ }));
    await history().findByText('https://exemplo.com/pagina-2');
    expect(history().queryByText('https://exemplo.com/pagina-1')).not.toBeInTheDocument();
    expect(items()).toHaveLength(1);
  });

  test('lista vazia mostra a mensagem', async () => {
    seed({ active: '2', links: [link(1, 1, '2026-11-23T19:00:00.000Z')] });
    render(<App />);
    expect(await history().findByText('Nenhum link ainda')).toBeInTheDocument();
  });

  test('encurtar faz o link novo aparecer no topo sem recarregar', async () => {
    seed({ active: '1', links: [link(1, 1, '2026-11-23T19:00:00.000Z')] });
    const spy = vi.spyOn(mock, 'listUserLinks');
    const user = userEvent.setup();
    render(<App />);
    await history().findByText('https://exemplo.com/pagina-1');
    const callsBefore = spy.mock.calls.length;

    await user.type(screen.getByLabelText('URL'), 'https://novo.exemplo.com/x');
    await user.click(screen.getByRole('button', { name: 'Encurtar' }));

    await history().findByText('https://novo.exemplo.com/x');
    const list = items();
    expect(list).toHaveLength(2);
    expect(within(list[0]).getByText('https://novo.exemplo.com/x')).toBeInTheDocument();
    expect(within(list[1]).getByText('https://exemplo.com/pagina-1')).toBeInTheDocument();
    // inserção no começo: nenhum novo pedido de histórico
    expect(spy.mock.calls.length).toBe(callsBefore);
  });

  test('primeiro link de um usuário sai de "Nenhum link ainda" para a lista', async () => {
    seed({ active: '2' });
    const user = userEvent.setup();
    render(<App />);
    await history().findByText('Nenhum link ainda');
    await user.type(screen.getByLabelText('URL'), 'https://exemplo.com/primeiro');
    await user.click(screen.getByRole('button', { name: 'Encurtar' }));
    await history().findByText('https://exemplo.com/primeiro');
    expect(history().queryByText('Nenhum link ainda')).not.toBeInTheDocument();
  });

  test('erro da API aparece com role=alert', async () => {
    seed({ active: '1' });
    vi.spyOn(mock, 'listUserLinks').mockRejectedValue({ error: 'Usuário não encontrado' });
    render(<App />);
    expect(await history().findByRole('alert')).toHaveTextContent('Usuário não encontrado');
  });
});
