import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { codeGenerator, createLink, MOCK_LINKS_KEY, MOCK_USERS_KEY } from '../api/mock.js';
import { ACTIVE_USER_KEY } from '../activeUser.js';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const URL_OK = 'https://www.exemplo.com/um/caminho/muito/longo';

// Mensagens copiadas literalmente de API.md (POST /api/links, tabela "Erros").
const URL_REQUIRED = 'A URL é obrigatória';
const URL_NOT_STRING = 'A URL deve ser um texto';
const URL_INVALID = 'URL inválida. Use um endereço começando com http:// ou https://';
const USERID_REQUIRED = 'O userId é obrigatório';
const USERID_NOT_INT = 'O userId deve ser um número inteiro';
const USER_NOT_FOUND = 'Usuário não encontrado';
const CODE_FAIL = 'Não foi possível gerar um código único. Tente novamente.';

beforeEach(() => {
  localStorage.setItem(
    MOCK_USERS_KEY,
    JSON.stringify([{ id: 1, name: 'Ana', avatar: 'cat', createdAt: '2026-11-23T18:00:00.000Z' }]),
  );
});

const originalNext = codeGenerator.next;
afterEach(() => {
  codeGenerator.next = originalNext;
});

describe('simulação de POST /api/links', () => {
  test('devolve o formato exato do contrato', async () => {
    const link = await createLink({ userId: 1, url: URL_OK });
    expect(Object.keys(link).sort()).toEqual(['code', 'createdAt', 'id', 'originalUrl', 'shortUrl', 'userId']);
    expect(Number.isInteger(link.id)).toBe(true);
    expect(link.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(link.shortUrl).toBe(`http://localhost:3000/${link.code}`);
    expect(link.originalUrl).toBe(URL_OK);
    expect(link.userId).toBe(1);
    expect(link.createdAt).toMatch(ISO);
  });

  test('guarda a URL exatamente como enviada (esquema em maiúsculas é aceito)', async () => {
    const url = 'HTTPS://Exemplo.com/A?b=1#c';
    expect((await createLink({ userId: 1, url })).originalUrl).toBe(url);
  });

  test('persiste em mockLinks, separada das outras chaves', async () => {
    const link = await createLink({ userId: 1, url: URL_OK });
    expect(JSON.parse(localStorage.getItem(MOCK_LINKS_KEY))).toEqual([link]);
    expect(JSON.parse(localStorage.getItem(MOCK_USERS_KEY))).toHaveLength(1);
    expect(localStorage.getItem(ACTIVE_USER_KEY)).toBeNull();
    expect(new Set([MOCK_LINKS_KEY, MOCK_USERS_KEY, ACTIVE_USER_KEY]).size).toBe(3);
  });

  test('mesma URL duas vezes gera dois links diferentes', async () => {
    const a = await createLink({ userId: 1, url: URL_OK });
    const b = await createLink({ userId: 1, url: URL_OK });
    expect(a.id).not.toBe(b.id);
    expect(a.code).not.toBe(b.code);
    expect(JSON.parse(localStorage.getItem(MOCK_LINKS_KEY))).toHaveLength(2);
  });

  test('tenta de novo quando o código colide', async () => {
    const codes = ['AAAAAA', 'AAAAAA', 'BBBBBB'];
    codeGenerator.next = () => codes.shift();
    expect((await createLink({ userId: 1, url: URL_OK })).code).toBe('AAAAAA');
    expect((await createLink({ userId: 1, url: URL_OK })).code).toBe('BBBBBB');
  });

  test('500 após 5 colisões seguidas', async () => {
    codeGenerator.next = () => 'AAAAAA';
    await createLink({ userId: 1, url: URL_OK });
    await expect(createLink({ userId: 1, url: URL_OK })).rejects.toEqual({ error: CODE_FAIL });
  });

  test.each([
    // url (validada primeiro, mesmo com userId inválido)
    [{ userId: 'x' }, URL_REQUIRED],
    [{}, URL_REQUIRED],
    [{ url: null, userId: 1 }, URL_REQUIRED],
    [{ url: 123, userId: null }, URL_NOT_STRING],
    [{ url: '', userId: 1 }, URL_INVALID],
    [{ url: 'www.exemplo.com', userId: 1 }, URL_INVALID],
    [{ url: 'ftp://exemplo.com', userId: 1 }, URL_INVALID],
    [{ url: 'javascript:alert(1)', userId: 1 }, URL_INVALID],
    [{ url: 'http://', userId: 1 }, URL_INVALID],
    [{ url: ' https://exemplo.com', userId: 1 }, URL_INVALID],
    [{ url: 'https://exemplo.com ', userId: 1 }, URL_INVALID],
    [{ url: 'https://exem plo.com', userId: 1 }, URL_INVALID],
    [{ url: 'https://exemplo.com/a\tb', userId: 1 }, URL_INVALID],
    [{ url: 'https://exemplo.com', userId: '1' }, USERID_NOT_INT],
    // userId
    [{ url: URL_OK }, USERID_REQUIRED],
    [{ url: URL_OK, userId: null }, USERID_REQUIRED],
    [{ url: URL_OK, userId: '1' }, USERID_NOT_INT],
    [{ url: URL_OK, userId: 1.5 }, USERID_NOT_INT],
    [{ url: URL_OK, userId: true }, USERID_NOT_INT],
    // usuário inexistente
    [{ url: URL_OK, userId: 99 }, USER_NOT_FOUND],
    [{ url: URL_OK, userId: 0 }, USER_NOT_FOUND],
    [{ url: URL_OK, userId: -1 }, USER_NOT_FOUND],
  ])('rejeita %j com { error: %s }', async (input, message) => {
    await expect(createLink(input)).rejects.toEqual({ error: message });
    expect(localStorage.getItem(MOCK_LINKS_KEY)).toBeNull();
  });
});
