const request = require('supertest');
const { createApp } = require('../src/app');
const { openDatabase } = require('../src/db/connection');
const { MESSAGES } = require('../src/validation/links');
const { MAX_CODE_ATTEMPTS } = require('../src/routes/links');
const { generateCode, ALPHABET } = require('../src/services/codeGenerator');

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CODE = /^[A-Za-z0-9]{6}$/;
const LINK_KEYS = ['code', 'createdAt', 'id', 'originalUrl', 'shortUrl', 'userId'];

describe('POST /api/links', () => {
  let db;
  let app;
  let user;

  function setup(options = {}) {
    db = openDatabase(':memory:');
    app = createApp({ db, ...options });
    user = app.locals.repos.users.create({ name: 'Alberi', avatar: 'rocket' });
  }

  beforeEach(() => setup());
  afterEach(() => db.close());

  const post = (body) => request(app).post('/api/links').send(body);
  const countLinks = () => db.prepare('SELECT COUNT(*) AS n FROM links').get().n;

  async function expectError(body, status, message) {
    const res = await post(body);
    expect(res.status).toBe(status);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: message });
    expect(countLinks()).toBe(0);
    return res;
  }

  describe('sucesso', () => {
    test('201 com formato exato do contrato', async () => {
      const url = 'https://www.exemplo.com/um/caminho/muito/longo';
      const res = await post({ userId: user.id, url });
      expect(res.status).toBe(201);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(Object.keys(res.body).sort()).toEqual(LINK_KEYS);
      expect(res.body).toEqual({
        id: expect.any(Number),
        code: expect.stringMatching(CODE),
        shortUrl: `http://localhost:3000/${res.body.code}`,
        originalUrl: url,
        userId: user.id,
        createdAt: expect.stringMatching(ISO_8601),
      });
      expect(Number.isInteger(res.body.id)).toBe(true);
      expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt);
    });

    test('grava o link no banco com o code devolvido', async () => {
      const res = await post({ userId: user.id, url: 'https://a.com' });
      expect(app.locals.repos.links.findByCode(res.body.code)).toMatchObject({
        id: res.body.id,
        originalUrl: 'https://a.com',
        userId: user.id,
      });
    });

    test.each([
      'http://exemplo.com',
      'https://exemplo.com',
      'http://localhost:8080/caminho',
      'https://sub.exemplo.com.br/a/b?x=1&y=2#ancora',
      'http://192.168.0.1',
      'HTTPS://EXEMPLO.COM/Caminho',
      'Http://exemplo.com',
    ])('aceita %s', async (url) => {
      const res = await post({ userId: user.id, url });
      expect(res.status).toBe(201);
    });

    test.each([
      'HTTPS://Exemplo.COM/Caminho/../X?q=%20a',
      'https://exemplo.com',
      'https://exemplo.com:443/',
      'https://exemplo.com/path/',
      'https://exemplo.com/á/ç',
    ])('guarda originalUrl exatamente como recebida: %s', async (url) => {
      const res = await post({ userId: user.id, url });
      expect(res.status).toBe(201);
      expect(res.body.originalUrl).toBe(url);
      expect(app.locals.repos.links.findByCode(res.body.code).originalUrl).toBe(url);
    });

    test('mesma URL duas vezes gera dois links com códigos diferentes', async () => {
      const url = 'https://exemplo.com/repetida';
      const a = (await post({ userId: user.id, url })).body;
      const b = (await post({ userId: user.id, url })).body;
      expect(a.id).not.toBe(b.id);
      expect(a.code).not.toBe(b.code);
      expect(a.shortUrl).not.toBe(b.shortUrl);
      expect(countLinks()).toBe(2);
    });

    test('campos extras no corpo são ignorados', async () => {
      const res = await post({ userId: user.id, url: 'https://a.com', code: 'MEU123', clicks: 5 });
      expect(res.status).toBe(201);
      expect(Object.keys(res.body).sort()).toEqual(LINK_KEYS);
      expect(res.body.code).not.toBe('MEU123');
    });
  });

  describe('validação da url (primeira)', () => {
    test.each([
      ['ausente', { }],
      ['null', { url: null }],
    ])('url %s -> 400', async (_label, extra) => {
      await expectError({ userId: user.id, ...extra }, 400, MESSAGES.urlRequired);
    });

    test.each([
      ['número', 123],
      ['booleano', true],
      ['array', ['https://a.com']],
      ['objeto', { href: 'https://a.com' }],
    ])('url do tipo %s -> 400', async (_label, url) => {
      await expectError({ userId: user.id, url }, 400, MESSAGES.urlNotString);
    });

    test.each([
      ['vazia', ''],
      ['sem esquema', 'www.exemplo.com'],
      ['sem esquema com barra', '//exemplo.com'],
      ['ftp', 'ftp://exemplo.com'],
      ['javascript', 'javascript:alert(1)'],
      ['javascript com barras', 'javascript://exemplo.com/%0Aalert(1)'],
      ['data', 'data:text/html,oi'],
      ['mailto', 'mailto:a@b.com'],
      ['http sem host', 'http://'],
      ['https sem host', 'https://'],
      ['http com só porta', 'http://:80'],
      ['esquema sem barras', 'http:exemplo.com'],
      ['uma barra só', 'http:/exemplo.com'],
      ['espaço no início', ' https://exemplo.com'],
      ['espaço no fim', 'https://exemplo.com '],
      ['quebra de linha no fim', 'https://exemplo.com\n'],
      ['espaço no meio', 'https://exem plo.com'],
      ['espaço no caminho', 'https://exemplo.com/a b'],
      ['só espaços', '   '],
      ['texto qualquer', 'não é url'],
    ])('url %s -> 400', async (_label, url) => {
      await expectError({ userId: user.id, url }, 400, MESSAGES.urlInvalid);
    });

    test('url inválida + usuário inexistente -> 400 da url', async () => {
      await expectError({ userId: 9999, url: 'ftp://x.com' }, 400, MESSAGES.urlInvalid);
    });

    test('url inválida + userId inválido -> 400 da url', async () => {
      await expectError({ userId: 'abc', url: 'sem-esquema' }, 400, MESSAGES.urlInvalid);
    });

    test('url ausente + userId ausente -> 400 da url', async () => {
      await expectError({}, 400, MESSAGES.urlRequired);
    });
  });

  describe('validação do userId (segunda)', () => {
    const url = 'https://exemplo.com';

    test('userId ausente -> 400', async () => {
      await expectError({ url }, 400, MESSAGES.userIdRequired);
    });

    test('userId null -> 400', async () => {
      await expectError({ url, userId: null }, 400, MESSAGES.userIdRequired);
    });

    test.each([
      ['string numérica', '1'],
      ['string', 'abc'],
      ['decimal', 1.5],
      ['booleano', true],
      ['array', [1]],
      ['objeto', { id: 1 }],
    ])('userId %s -> 400', async (_label, userId) => {
      await expectError({ url, userId }, 400, MESSAGES.userIdNotInteger);
    });

    test('userId inválido + usuário inexistente -> 400 (antes do 404)', async () => {
      await expectError({ url, userId: '9999' }, 400, MESSAGES.userIdNotInteger);
    });
  });

  describe('usuário inexistente (terceira)', () => {
    test.each([9999, 0, -1])('userId %s inexistente -> 404', async (userId) => {
      await expectError({ url: 'https://exemplo.com', userId }, 404, MESSAGES.userNotFound);
    });
  });

  describe('corpo', () => {
    test('corpo vazio -> 400 url obrigatória', async () => {
      const res = await request(app).post('/api/links');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: MESSAGES.urlRequired });
    });

    test('Content-Type não JSON cai como campos ausentes', async () => {
      const res = await request(app)
        .post('/api/links')
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify({ url: 'https://a.com', userId: user.id }));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: MESSAGES.urlRequired });
    });

    test('corpo JSON que é array -> 400 url obrigatória', async () => {
      await expectError([{ url: 'https://a.com', userId: user.id }], 400, MESSAGES.urlRequired);
    });
  });

  describe('geração do código', () => {
    test('colisão é resolvida com nova tentativa', async () => {
      db.close();
      const codes = ['AAAAAA', 'AAAAAA', 'BBBBBB'];
      const gen = jest.fn(() => codes.shift());
      setup({ generateCode: gen });

      const first = await post({ userId: user.id, url: 'https://a.com' });
      expect(first.status).toBe(201);
      expect(first.body.code).toBe('AAAAAA');

      const second = await post({ userId: user.id, url: 'https://b.com' });
      expect(second.status).toBe(201);
      expect(second.body.code).toBe('BBBBBB');
      expect(second.body.shortUrl).toBe('http://localhost:3000/BBBBBB');
      expect(gen).toHaveBeenCalledTimes(3);
      expect(countLinks()).toBe(2);
    });

    test(`estourando ${MAX_CODE_ATTEMPTS} tentativas -> 500 no formato padrão, nada gravado`, async () => {
      db.close();
      const gen = jest.fn(() => 'AAAAAA');
      setup({ generateCode: gen });
      expect((await post({ userId: user.id, url: 'https://a.com' })).status).toBe(201);
      gen.mockClear();

      const res = await post({ userId: user.id, url: 'https://b.com' });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: MESSAGES.codeGenerationFailed });
      expect(gen).toHaveBeenCalledTimes(MAX_CODE_ATTEMPTS);
      expect(countLinks()).toBe(1);
    });

    test('erro de banco que não é colisão vira 500 genérico', async () => {
      db.close();
      setup({ generateCode: () => { throw new Error('falha inesperada'); } });
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const res = await post({ userId: user.id, url: 'https://a.com' });
      spy.mockRestore();
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Erro interno do servidor' });
    });

    test('gerador padrão produz [A-Za-z0-9]{6} e usa o alfabeto todo', () => {
      expect(ALPHABET).toHaveLength(62);
      const seen = new Set();
      for (let i = 0; i < 2000; i += 1) {
        const code = generateCode();
        expect(code).toMatch(CODE);
        for (const ch of code) seen.add(ch);
      }
      expect(seen.size).toBe(62);
    });
  });

  test('CORS liberado para o frontend', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('Origin', 'http://localhost:5173')
      .send({ userId: user.id, url: 'https://a.com' });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
