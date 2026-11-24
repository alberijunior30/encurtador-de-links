import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { MOCK_USERS_KEY } from '../api/mock.js';
import { ACTIVE_USER_KEY } from '../activeUser.js';

const seed = [
  { id: 1, name: 'Ana', avatar: 'cat', createdAt: '2026-11-23T18:00:00.000Z' },
  { id: 2, name: 'Bruno', avatar: 'robot', createdAt: '2026-11-23T19:00:00.000Z' },
];

function seedUsers() {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(seed));
}

function userButton(name) {
  return screen.getByRole('button', { name: new RegExp(name) });
}

describe('App — criar e escolher usuário', () => {
  test('lista usuários do mais antigo para o mais recente com avatar em emoji', async () => {
    seedUsers();
    render(<App />);
    await screen.findByText('Ana');
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['🐱Ana', '🤖Bruno']);
  });

  test('criar adiciona à lista e vira o usuário ativo', async () => {
    seedUsers();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Ana');

    await user.type(screen.getByLabelText('Nome'), '  Carla  ');
    await user.click(screen.getByRole('button', { name: 'ghost' }));
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    const carla = await screen.findByRole('button', { name: /Carla/ });
    expect(carla).toHaveAttribute('aria-pressed', 'true');
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.at(-1)).toHaveTextContent('👻Carla');
    expect(localStorage.getItem(ACTIVE_USER_KEY)).toBe('3');
  });

  test('escolher um usuário grava o id no localStorage', async () => {
    seedUsers();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Ana');

    await user.click(userButton('Bruno'));
    expect(localStorage.getItem(ACTIVE_USER_KEY)).toBe('2');
    expect(userButton('Bruno')).toHaveAttribute('aria-pressed', 'true');
    expect(userButton('Ana')).toHaveAttribute('aria-pressed', 'false');
  });

  test('restaura o usuário ativo ao recarregar', async () => {
    seedUsers();
    localStorage.setItem(ACTIVE_USER_KEY, '2');
    render(<App />);
    await screen.findByText('Bruno');
    expect(userButton('Bruno')).toHaveAttribute('aria-pressed', 'true');
  });

  test('usuários criados e o ativo sobrevivem ao recarregar', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.type(screen.getByLabelText('Nome'), 'Dani');
    await user.click(screen.getByRole('button', { name: 'star' }));
    await user.click(screen.getByRole('button', { name: 'Criar' }));
    await screen.findByRole('button', { name: /Dani/ });
    unmount();

    render(<App />);
    const dani = await screen.findByRole('button', { name: /Dani/ });
    expect(dani).toHaveAttribute('aria-pressed', 'true');
  });

  test('limpa a seleção se o id salvo não existe na lista', async () => {
    seedUsers();
    localStorage.setItem(ACTIVE_USER_KEY, '99');
    render(<App />);
    await screen.findByText('Ana');
    expect(localStorage.getItem(ACTIVE_USER_KEY)).toBeNull();
    expect(screen.queryByText('ativo')).not.toBeInTheDocument();
  });

  test('mostra a mensagem { error } vinda da camada de API', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Nome'), 'Eva');
    await user.click(screen.getByRole('button', { name: 'Criar' })); // sem avatar
    expect(await screen.findByRole('alert')).toHaveTextContent('O avatar é obrigatório');
    expect(localStorage.getItem(MOCK_USERS_KEY)).toBeNull();
  });

  test('valida o nome com trim e conta emoji como 1 caractere', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByLabelText('Nome');

    await user.type(input, '   ');
    await user.click(screen.getByRole('button', { name: 'Criar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('O nome não pode ficar vazio');

    await user.clear(input);
    await user.type(input, '🚀'.repeat(31));
    await user.click(screen.getByRole('button', { name: 'Criar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('O nome deve ter no máximo 30 caracteres');

    await user.clear(input);
    await user.type(input, '🚀'.repeat(30));
    await user.click(screen.getByRole('button', { name: 'rocket' }));
    await user.click(screen.getByRole('button', { name: 'Criar' }));
    expect(await screen.findByRole('button', { name: /🚀{30}/u })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
