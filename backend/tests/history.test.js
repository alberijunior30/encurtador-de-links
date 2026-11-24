const request = require('supertest');
const { createApp } = require('../src/app');
const { openDatabase } = require('../src/db/connection');
const { parseUserId } = require('../src/routes/users');

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LINK_KEYS = ['code', 'createdAt', 'id', 'originalUrl', 'shortUrl', 'userId'];
const NOT_FOUND = { error: 'Usuário não encontrado' };

describe('GET /api/users/:id/links', () => {
  let db;
  let app;
  let repos;

  beforeEach(() => {
    db = openDatabase(':memory:');
    app = createApp({ db });
    repos = app.locals.repos;
  });

  afterEach(() => db.close());

  const history = (id) => request(app).get(`/api/users/${id}/links`);
  const insertLink = db_ => db_.prepare(
    'INSERT INTO links (code, original_url, user_id, created_at) VALUES (?, ?, ?, ?)'
  );

  test('200 com formato exato do contrato', async () => {
    const user = repos.users.create({ name: 'Ana', avatar: 'cat' });
    const created = (await request(app).post('/api/links').send({ userId: user.id, url: 'https://a.com/x' })).body;

    const res = await history(user.id);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toHaveLength(1);
    expect(Object.keys(res.body[0]).sort()).toEqual(LINK_KEYS);
    expect(res.body[0]).toEqual({
      id: created.id,
      code: created.code,
      shortUrl: `http://localhost:3000/${created.code}`,
      originalUrl: 'https://a.com/x',
      userId: user.id,
      createdAt: expect.stringMatching(ISO_8601),
    });
    // Mesmo objeto que o POST devolveu.
    expect(res.body[0]).toEqual(created);
  });

  test('[] para usuário sem links', async () => {
    const user = repos.users.create({ name: 'Ana', avatar: 'cat' });
    const res = await history(user.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('devolve só os links do usuário pedido', async () => {
    const ana = repos.users.create({ name: 'Ana', avatar: 'cat' });
    const bia = repos.users.create({ name: 'Bia', avatar: 'dog' });
    for (const [userId, url] of [[ana.id, 'https://ana1.com'], [bia.id, 'https://bia1.com'], [ana.id, 'https://ana2.com'], [bia.id, 'https://bia2.com'], [bia.id, 'https://bia3.com']]) {
      await request(app).post('/api/links').send({ userId, url });
    }

    const resAna = await history(ana.id);
    expect(resAna.body.map((l) => l.originalUrl)).toEqual(['https://ana2.com', 'https://ana1.com']);
    expect(resAna.body.every((l) => l.userId === ana.id)).toBe(true);

    const resBia = await history(bia.id);
    expect(resBia.body.map((l) => l.originalUrl)).toEqual(['https://bia3.com', 'https://bia2.com', 'https://bia1.com']);
    expect(resBia.body.every((l) => l.userId === bia.id)).toBe(true);
  });

  test('ordena por createdAt DESC mesmo com datas fora da ordem de id', async () => {
    const user = repos.users.create({ name: 'Ana', avatar: 'cat' });
    const insert = insertLink(db);
    insert.run('MEIO01', 'https://meio.com', user.id, '2026-11-23T12:00:00.000Z');
    insert.run('ANTIGO', 'https://antigo.com', user.id, '2026-11-20T08:00:00.000Z');
    insert.run('NOVO01', 'https://novo.com', user.id, '2026-11-23T18:00:00.000Z');

    const res = await history(user.id);
    expect(res.body.map((l) => l.code)).toEqual(['NOVO01', 'MEIO01', 'ANTIGO']);
  });

  test('empate de createdAt desempata por id DESC', async () => {
    const user = repos.users.create({ name: 'Ana', avatar: 'cat' });
    const insert = insertLink(db);
    const same = '2026-11-23T12:00:00.000Z';
    insert.run('EMPAT1', 'https://1.com', user.id, same);
    insert.run('VELHO1', 'https://v.com', user.id, '2026-11-01T00:00:00.000Z');
    insert.run('EMPAT2', 'https://2.com', user.id, same);
    insert.run('EMPAT3', 'https://3.com', user.id, same);

    const res = await history(user.id);
    expect(res.body.map((l) => l.code)).toEqual(['EMPAT3', 'EMPAT2', 'EMPAT1', 'VELHO1']);
  });

  test('links criados em sequência pela API saem do mais recente para o mais antigo', async () => {
    const user = repos.users.create({ name: 'Ana', avatar: 'cat' });
    for (const url of ['https://1.com', 'https://2.com', 'https://3.com']) {
      await request(app).post('/api/links').send({ userId: user.id, url });
    }
    const res = await history(user.id);
    expect(res.body.map((l) => l.originalUrl)).toEqual(['https://3.com', 'https://2.com', 'https://1.com']);
  });

  test('404 para usuário inexistente', async () => {
    const res = await history(9999);
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual(NOT_FOUND);
  });

  test('404 para 0', async () => {
    const res = await history(0);
    expect(res.status).toBe(404);
    expect(res.body).toEqual(NOT_FOUND);
  });

  test.each([
    ['abc', 'abc'],
    ['1.5', '1.5'],
    ['-1', '-1'],
    ['1e3', '1e3'],
    ["' 1'", '%201'],
    ["'1 '", '1%20'],
    ['0x1', '0x1'],
    ['+1', '%2B1'],
    ['1abc', '1abc'],
    ['enorme', '99999999999999999999'],
    ['MAX_SAFE_INTEGER + 1', String(Number.MAX_SAFE_INTEGER + 1)],
  ])(':id %s -> 404 no formato padrão', async (_label, raw) => {
    repos.users.create({ name: 'Ana', avatar: 'cat' });
    const res = await history(raw);
    expect(res.status).toBe(404);
    expect(res.body).toEqual(NOT_FOUND);
  });

  test(':id vazio (/api/users//links) -> 404 JSON', async () => {
    const res = await request(app).get('/api/users//links');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  test('zeros à esquerda são aceitos (01 -> usuário 1)', async () => {
    const user = repos.users.create({ name: 'Ana', avatar: 'cat' });
    expect(user.id).toBe(1);
    await request(app).post('/api/links').send({ userId: 1, url: 'https://a.com' });
    const res = await history('001');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].userId).toBe(1);
  });

  test('parseUserId', () => {
    expect(parseUserId('1')).toBe(1);
    expect(parseUserId('01')).toBe(1);
    expect(parseUserId(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    expect(parseUserId(String(Number.MAX_SAFE_INTEGER + 1))).toBeNull();
    for (const raw of ['', 'abc', '1.5', '-1', '1e3', ' 1', '1 ', '+1', '0x1']) {
      expect(parseUserId(raw)).toBeNull();
    }
  });

  test('CORS liberado para o frontend', async () => {
    const user = repos.users.create({ name: 'Ana', avatar: 'cat' });
    const res = await history(user.id).set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  test('não conflita com POST/GET /api/users e POST /api/links', async () => {
    const created = await request(app).post('/api/users').send({ name: 'Ana', avatar: 'cat' });
    expect(created.status).toBe(201);
    const list = await request(app).get('/api/users');
    expect(list.status).toBe(200);
    expect(list.body).toEqual([created.body]);
    const link = await request(app).post('/api/links').send({ userId: created.body.id, url: 'https://a.com' });
    expect(link.status).toBe(201);
    expect((await history(created.body.id)).body).toEqual([link.body]);
  });

  test('métodos não suportados na rota de histórico caem no 404 JSON', async () => {
    const user = repos.users.create({ name: 'Ana', avatar: 'cat' });
    const res = await request(app).post(`/api/users/${user.id}/links`).send({});
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Rota não encontrada' });
  });
});
