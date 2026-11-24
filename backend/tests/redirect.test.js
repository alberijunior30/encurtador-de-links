const request = require('supertest');
const { createApp } = require('../src/app');
const { openDatabase } = require('../src/db/connection');
const { MESSAGES } = require('../src/routes/redirect');

const LINK_NOT_FOUND = { error: 'Link não encontrado' };
const ROUTE_NOT_FOUND = { error: 'Rota não encontrada' };

describe('GET /:codigo', () => {
  let db;
  let app;
  let user;

  beforeEach(() => {
    db = openDatabase(':memory:');
    app = createApp({ db });
    user = app.locals.repos.users.create({ name: 'Ana', avatar: 'cat' });
  });

  afterEach(() => db.close());

  const addLink = (code, originalUrl) =>
    app.locals.repos.links.create({ code, originalUrl, userId: user.id });

  test('mensagem do 404 é a do contrato', () => {
    expect(MESSAGES.linkNotFound).toBe(LINK_NOT_FOUND.error);
  });

  describe('código existente', () => {
    test.each([
      'http://exemplo.com',
      'https://www.exemplo.com/um/caminho/muito/longo',
      'https://exemplo.com/a/b?x=1&y=dois#ancora',
      'http://localhost:8080/caminho',
      'HTTPS://Exemplo.COM/Caminho/../X',
      'https://exemplo.com/a%20b/%C3%A1',
    ])('302 com Location idêntica: %s', async (url) => {
      addLink('aB3xK9', url);
      const res = await request(app).get('/aB3xK9');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(url);
    });

    test('fluxo completo: POST /api/links -> GET shortUrl redireciona', async () => {
      const url = 'https://www.exemplo.com/fluxo?completo=1';
      const created = (await request(app).post('/api/links').send({ userId: user.id, url })).body;
      const res = await request(app).get(new URL(created.shortUrl).pathname);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(url);
    });

    test('URL com acentos sai em percent-encoding UTF-8 (encodeurl do Express)', async () => {
      addLink('acento', 'https://exemplo.com/á/ç?q=ã');
      const res = await request(app).get('/acento');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://exemplo.com/%C3%A1/%C3%A7?q=%C3%A3');
      // No banco continua exatamente como recebida.
      expect(app.locals.repos.links.findByCode('acento').originalUrl).toBe('https://exemplo.com/á/ç?q=ã');
    });

    test('%20 já codificado é preservado', async () => {
      addLink('pct020', 'https://exemplo.com/a%20b');
      const res = await request(app).get('/pct020');
      expect(res.headers.location).toBe('https://exemplo.com/a%20b');
    });

    test('dois links diferentes redirecionam cada um para sua URL', async () => {
      addLink('AAAAA1', 'https://um.com');
      addLink('AAAAA2', 'https://dois.com');
      expect((await request(app).get('/AAAAA1')).headers.location).toBe('https://um.com');
      expect((await request(app).get('/AAAAA2')).headers.location).toBe('https://dois.com');
    });

    test('query string na URL curta é ignorada', async () => {
      addLink('aB3xK9', 'https://exemplo.com/destino');
      const res = await request(app).get('/aB3xK9?utm=x');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://exemplo.com/destino');
    });

    test('HEAD responde 302 com Location e sem corpo', async () => {
      addLink('aB3xK9', 'https://exemplo.com/destino');
      const res = await request(app).head('/aB3xK9');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://exemplo.com/destino');
      expect(res.text).toBeFalsy();
    });

    test('HEAD de código inexistente -> 404', async () => {
      const res = await request(app).head('/zzzzzz');
      expect(res.status).toBe(404);
    });

    test('código que começa com "api" não é confundido com /api', async () => {
      addLink('api123', 'https://exemplo.com/api');
      const res = await request(app).get('/api123');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://exemplo.com/api');
    });

    test('não grava nada (sem contagem de cliques)', async () => {
      addLink('aB3xK9', 'https://exemplo.com');
      const before = db.prepare('SELECT * FROM links').all();
      await request(app).get('/aB3xK9');
      await request(app).get('/aB3xK9');
      expect(db.prepare('SELECT * FROM links').all()).toEqual(before);
    });
  });

  describe('código inexistente', () => {
    test('código válido inexistente -> 404 com corpo exato', async () => {
      const res = await request(app).get('/zZ9yY8');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers.location).toBeUndefined();
      expect(res.body).toEqual(LINK_NOT_FOUND);
    });

    test.each(['AB3XK9', 'ab3xk9', 'Ab3xK9', 'aB3XK9'])('busca é case-sensitive: %s -> 404', async (code) => {
      addLink('aB3xK9', 'https://exemplo.com');
      const res = await request(app).get(`/${code}`);
      expect(res.status).toBe(404);
      expect(res.body).toEqual(LINK_NOT_FOUND);
    });
  });

  describe('formato inválido cai no 404 geral', () => {
    test.each([
      ['curto', '/abc'],
      ['5 caracteres', '/aB3xK'],
      ['7 caracteres', '/aB3xK9x'],
      ['hífen e underline', '/a-b_c1'],
      ['ponto', '/aB3.K9'],
      ['espaço', '/aB3%20K9'],
      ['acento', '/aB3x%C3%A1'],
      ['subcaminho', '/aB3xK9/extra'],
      ['raiz', '/'],
      ['favicon', '/favicon.ico'],
    ])('%s (%s) -> 404 Rota não encontrada', async (_label, path) => {
      addLink('aB3xK9', 'https://exemplo.com');
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      expect(res.headers.location).toBeUndefined();
      expect(res.body).toEqual(ROUTE_NOT_FOUND);
    });

    test('POST /:codigo não redireciona -> 404 Rota não encontrada', async () => {
      addLink('aB3xK9', 'https://exemplo.com');
      const res = await request(app).post('/aB3xK9');
      expect(res.status).toBe(404);
      expect(res.body).toEqual(ROUTE_NOT_FOUND);
    });
  });

  describe('rotas /api intactas', () => {
    test('GET /api -> 404 Rota não encontrada (não vira busca de código)', async () => {
      const res = await request(app).get('/api');
      expect(res.status).toBe(404);
      expect(res.body).toEqual(ROUTE_NOT_FOUND);
    });

    test('GET /api/users -> 200', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([user]);
    });

    test('POST /api/users -> 201', async () => {
      const res = await request(app).post('/api/users').send({ name: 'Bia', avatar: 'dog' });
      expect(res.status).toBe(201);
    });

    test('POST /api/links -> 201 e GET /api/users/:id/links -> 200', async () => {
      const link = await request(app).post('/api/links').send({ userId: user.id, url: 'https://a.com' });
      expect(link.status).toBe(201);
      const hist = await request(app).get(`/api/users/${user.id}/links`);
      expect(hist.status).toBe(200);
      expect(hist.body).toEqual([link.body]);
    });

    test('GET /api/links (inexistente) -> 404 Rota não encontrada', async () => {
      const res = await request(app).get('/api/links');
      expect(res.status).toBe(404);
      expect(res.body).toEqual(ROUTE_NOT_FOUND);
    });

    test('CORS continua nas rotas /api', async () => {
      const res = await request(app).get('/api/users').set('Origin', 'http://localhost:5173');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });
});
