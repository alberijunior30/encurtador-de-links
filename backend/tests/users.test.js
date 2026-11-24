const request = require('supertest');
const { createApp } = require('../src/app');
const { openDatabase } = require('../src/db/connection');
const { AVATARS, MESSAGES } = require('../src/validation/users');

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('Rotas de usuários', () => {
  let db;
  let app;

  beforeEach(() => {
    db = openDatabase(':memory:');
    app = createApp({ db });
  });

  afterEach(() => db.close());

  const post = (body) => request(app).post('/api/users').send(body);

  async function expect400(body, message) {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: message });
    return res;
  }

  describe('POST /api/users', () => {
    test('201 com formato exato do contrato, sem campos extras', async () => {
      const res = await post({ name: 'Alberi', avatar: 'rocket' });
      expect(res.status).toBe(201);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(Object.keys(res.body).sort()).toEqual(['avatar', 'createdAt', 'id', 'name']);
      expect(res.body).toEqual({
        id: expect.any(Number),
        name: 'Alberi',
        avatar: 'rocket',
        createdAt: expect.stringMatching(ISO_8601),
      });
      expect(Number.isInteger(res.body.id)).toBe(true);
      expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt);
    });

    test('campos extras no corpo são ignorados', async () => {
      const res = await post({ name: 'Ana', avatar: 'cat', id: 99, admin: true });
      expect(res.status).toBe(201);
      expect(Object.keys(res.body).sort()).toEqual(['avatar', 'createdAt', 'id', 'name']);
      expect(res.body.id).not.toBe(99);
    });

    test('aplica trim e salva o nome já sem espaços nas pontas', async () => {
      const res = await post({ name: '   Alberi Junior \t\n', avatar: 'cat' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Alberi Junior');
      const [saved] = (await request(app).get('/api/users')).body;
      expect(saved.name).toBe('Alberi Junior');
    });

    test('aceita nome com 1 caractere', async () => {
      const res = await post({ name: 'A', avatar: 'dog' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('A');
    });

    test('aceita nome com 30 caracteres', async () => {
      const name = 'a'.repeat(30);
      const res = await post({ name, avatar: 'dog' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe(name);
    });

    test('limite é avaliado depois do trim (30 + espaços é aceito)', async () => {
      const res = await post({ name: `  ${'b'.repeat(30)}  `, avatar: 'dog' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('b'.repeat(30));
    });

    test('conta emoji como 1 caractere (30 emojis aceitos, 31 recusados)', async () => {
      expect((await post({ name: '🚀'.repeat(30), avatar: 'rocket' })).status).toBe(201);
      await expect400({ name: '🚀'.repeat(31), avatar: 'rocket' }, MESSAGES.nameTooLong);
    });

    test('recusa nome com 31 caracteres', async () => {
      await expect400({ name: 'a'.repeat(31), avatar: 'dog' }, MESSAGES.nameTooLong);
    });

    test('recusa nome vazio', async () => {
      await expect400({ name: '', avatar: 'dog' }, MESSAGES.nameEmpty);
    });

    test('recusa nome só com espaços', async () => {
      await expect400({ name: '     ', avatar: 'dog' }, MESSAGES.nameEmpty);
    });

    test('recusa nome ausente', async () => {
      await expect400({ avatar: 'dog' }, MESSAGES.nameRequired);
    });

    test('recusa nome null', async () => {
      await expect400({ name: null, avatar: 'dog' }, MESSAGES.nameRequired);
    });

    test.each([
      ['número', 123],
      ['booleano', true],
      ['array', ['Ana']],
      ['objeto', { first: 'Ana' }],
    ])('recusa nome do tipo %s', async (_label, name) => {
      await expect400({ name, avatar: 'dog' }, MESSAGES.nameNotString);
    });

    test.each(AVATARS)('aceita o avatar "%s"', async (avatar) => {
      const res = await post({ name: 'Ana', avatar });
      expect(res.status).toBe(201);
      expect(res.body.avatar).toBe(avatar);
    });

    test.each(['unicorn', 'Cat', ' cat', ''])('recusa avatar inválido "%s"', async (avatar) => {
      await expect400({ name: 'Ana', avatar }, MESSAGES.avatarInvalid);
    });

    test('recusa avatar ausente', async () => {
      await expect400({ name: 'Ana' }, MESSAGES.avatarRequired);
    });

    test.each([
      ['número', 1],
      ['array', ['cat']],
    ])('recusa avatar do tipo %s', async (_label, avatar) => {
      await expect400({ name: 'Ana', avatar }, MESSAGES.avatarInvalid);
    });

    test('recusa corpo vazio', async () => {
      const res = await request(app).post('/api/users');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: MESSAGES.nameRequired });
    });

    test('recusa objeto vazio', async () => {
      await expect400({}, MESSAGES.nameRequired);
    });

    test('recusa corpo JSON que é array', async () => {
      await expect400([{ name: 'Ana', avatar: 'cat' }], MESSAGES.nameRequired);
    });

    test('Content-Type não JSON cai como campos ausentes', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Content-Type', 'text/plain')
        .send('{"name":"Ana","avatar":"cat"}');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: MESSAGES.nameRequired });
    });

    test('form-urlencoded também cai como campos ausentes', async () => {
      const res = await request(app).post('/api/users').type('form').send({ name: 'Ana', avatar: 'cat' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: MESSAGES.nameRequired });
    });

    test('requisição recusada não grava nada', async () => {
      await post({ name: '', avatar: 'cat' });
      await post({ name: 'Ana', avatar: 'xx' });
      const res = await request(app).get('/api/users');
      expect(res.body).toEqual([]);
    });

    test('ids são inteiros crescentes', async () => {
      const a = (await post({ name: 'A', avatar: 'cat' })).body;
      const b = (await post({ name: 'B', avatar: 'cat' })).body;
      expect(b.id).toBeGreaterThan(a.id);
    });
  });

  describe('GET /api/users', () => {
    test('lista vazia retorna []', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual([]);
    });

    test('retorna os usuários criados no formato do contrato', async () => {
      const created = (await post({ name: 'Ana', avatar: 'star' })).body;
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([created]);
      expect(Object.keys(res.body[0]).sort()).toEqual(['avatar', 'createdAt', 'id', 'name']);
      expect(res.body[0].createdAt).toMatch(ISO_8601);
    });

    test('ordena por createdAt, do mais antigo para o mais recente', async () => {
      // Insere direto com datas fora da ordem de id para provar que a ordenação é por createdAt.
      const insert = db.prepare('INSERT INTO users (name, avatar, created_at) VALUES (?, ?, ?)');
      insert.run('Meio', 'cat', '2026-11-23T12:00:00.000Z');
      insert.run('Novo', 'dog', '2026-11-23T18:00:00.000Z');
      insert.run('Antigo', 'star', '2026-11-22T08:00:00.000Z');

      const res = await request(app).get('/api/users');
      expect(res.body.map((u) => u.name)).toEqual(['Antigo', 'Meio', 'Novo']);
    });

    test('usuários criados em sequência pela API saem na ordem de criação', async () => {
      for (const name of ['Primeiro', 'Segundo', 'Terceiro']) {
        await post({ name, avatar: 'robot' });
      }
      const res = await request(app).get('/api/users');
      expect(res.body.map((u) => u.name)).toEqual(['Primeiro', 'Segundo', 'Terceiro']);
    });
  });

  test('CORS liberado para o frontend nas rotas de usuários', async () => {
    const res = await request(app).get('/api/users').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
