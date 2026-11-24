import { describe, expect, test } from 'vitest';
import { createUser, listUsers, MOCK_USERS_KEY } from '../api/mock.js';
import { ACTIVE_USER_KEY } from '../activeUser.js';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('simulação da API de usuários', () => {
  test('createUser devolve o formato exato do contrato', async () => {
    const user = await createUser({ name: '  Alberi  ', avatar: 'rocket' });
    expect(Object.keys(user).sort()).toEqual(['avatar', 'createdAt', 'id', 'name']);
    expect(Number.isInteger(user.id)).toBe(true);
    expect(user.name).toBe('Alberi');
    expect(user.avatar).toBe('rocket');
    expect(user.createdAt).toMatch(ISO);
  });

  test('listUsers começa vazia e lista do mais antigo para o mais recente', async () => {
    expect(await listUsers()).toEqual([]);
    const a = await createUser({ name: 'A', avatar: 'cat' });
    const b = await createUser({ name: 'B', avatar: 'dog' });
    const list = await listUsers();
    expect(list.map((u) => u.id)).toEqual([a.id, b.id]);
    expect(b.id).toBeGreaterThan(a.id);
  });

  test('ordena por createdAt mesmo se o armazenamento estiver fora de ordem', async () => {
    localStorage.setItem(
      MOCK_USERS_KEY,
      JSON.stringify([
        { id: 2, name: 'Novo', avatar: 'cat', createdAt: '2026-11-23T19:00:00.000Z' },
        { id: 1, name: 'Velho', avatar: 'dog', createdAt: '2026-11-23T18:00:00.000Z' },
      ]),
    );
    expect((await listUsers()).map((u) => u.name)).toEqual(['Velho', 'Novo']);
  });

  test('persiste no localStorage em chave própria, separada do usuário ativo', async () => {
    const user = await createUser({ name: 'Ana', avatar: 'star' });
    expect(MOCK_USERS_KEY).not.toBe(ACTIVE_USER_KEY);
    expect(JSON.parse(localStorage.getItem(MOCK_USERS_KEY))).toEqual([user]);
    expect(localStorage.getItem(ACTIVE_USER_KEY)).toBeNull();
    // "recarregar": nova leitura vem do localStorage
    expect(await listUsers()).toEqual([user]);
  });

  test('aceita 30 caracteres contando emoji como 1 e recusa 31', async () => {
    await expect(createUser({ name: '🚀'.repeat(30), avatar: 'rocket' })).resolves.toBeTruthy();
    await expect(createUser({ name: '🚀'.repeat(31), avatar: 'rocket' })).rejects.toEqual({
      error: 'O nome deve ter no máximo 30 caracteres',
    });
  });

  test.each([
    [{ avatar: 'cat' }, 'O nome é obrigatório'],
    [{ name: null, avatar: 'cat' }, 'O nome é obrigatório'],
    [{ name: 123, avatar: 'cat' }, 'O nome deve ser um texto'],
    [{ name: '', avatar: 'cat' }, 'O nome não pode ficar vazio'],
    [{ name: '   ', avatar: 'cat' }, 'O nome não pode ficar vazio'],
    [{ name: 'a'.repeat(31), avatar: 'cat' }, 'O nome deve ter no máximo 30 caracteres'],
    [{ name: 'Ana' }, 'O avatar é obrigatório'],
    [{ name: 'Ana', avatar: 'unicorn' }, 'Avatar inválido. Use um destes: cat, dog, rocket, robot, ghost, star'],
    [{ name: 'Ana', avatar: 'Cat' }, 'Avatar inválido. Use um destes: cat, dog, rocket, robot, ghost, star'],
    [{ name: '', avatar: 'unicorn' }, 'O nome não pode ficar vazio'], // name é validado primeiro
  ])('rejeita %j com { error: %s }', async (input, message) => {
    await expect(createUser(input)).rejects.toEqual({ error: message });
    expect(await listUsers()).toEqual([]);
  });
});
