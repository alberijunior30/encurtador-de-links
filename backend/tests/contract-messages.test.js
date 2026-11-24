// Testes de contrato: cada linha das tabelas de erro do ../API.md, via HTTP.
// As mensagens são LITERAIS (copiadas do API.md), de propósito não importadas de src/,
// para que um erro de digitação no código quebre o teste.
const zlib = require('node:zlib');
const request = require('supertest');
const { createApp } = require('../src/app');
const { openDatabase } = require('../src/db/connection');

describe('Contrato: mensagens de erro do API.md', () => {
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

  async function expectError(req, status, error) {
    const res = await req;
    expect(res.status).toBe(status);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error });
  }

  describe('Erros gerais', () => {
    test('400 | JSON malformado no corpo', async () => {
      await expectError(
        request(app).post('/api/users').set('Content-Type', 'application/json').send('{"name":'),
        400,
        'JSON malformado na requisição'
      );
    });

    test('404 | rota inexistente', async () => {
      await expectError(request(app).get('/api/nao-existe'), 404, 'Rota não encontrada');
    });

    test('413 | corpo da requisição grande demais', async () => {
      const big = JSON.stringify({ name: 'x'.repeat(200 * 1024), avatar: 'cat' });
      await expectError(
        request(app).post('/api/users').set('Content-Type', 'application/json').send(big),
        413,
        'Corpo da requisição grande demais'
      );
    });

    test('415 | charset diferente de utf-8', async () => {
      await expectError(
        request(app)
          .post('/api/users')
          .set('Content-Type', 'application/json; charset=latin1')
          .send('{"name":"Ana","avatar":"cat"}'),
        415,
        'Charset não suportado; use utf-8'
      );
    });

    test('415 | codificação de conteúdo não suportada', async () => {
      await expectError(
        request(app)
          .post('/api/users')
          .set('Content-Type', 'application/json')
          .set('Content-Encoding', 'xyz')
          .serialize((body) => body)
          .send(zlib.gzipSync('{"name":"Ana","avatar":"cat"}')),
        415,
        'Codificação de conteúdo não suportada'
      );
    });

    test('500 | erro inesperado', async () => {
      db.close();
      setup({
        generateCode: () => {
          throw new Error('falha forçada');
        },
      });
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        await expectError(
          request(app).post('/api/links').send({ userId: user.id, url: 'https://a.com' }),
          500,
          'Erro interno do servidor'
        );
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('POST /api/users', () => {
    const post = (body) => request(app).post('/api/users').send(body);

    test('400 | name ausente ou null', async () => {
      await expectError(post({ avatar: 'cat' }), 400, 'O nome é obrigatório');
      await expectError(post({ name: null, avatar: 'cat' }), 400, 'O nome é obrigatório');
    });

    test('400 | name não é texto', async () => {
      await expectError(post({ name: 42, avatar: 'cat' }), 400, 'O nome deve ser um texto');
    });

    test('400 | name vazio ou só espaços (após trim)', async () => {
      await expectError(post({ name: '', avatar: 'cat' }), 400, 'O nome não pode ficar vazio');
      await expectError(post({ name: '   ', avatar: 'cat' }), 400, 'O nome não pode ficar vazio');
    });

    test('400 | name com mais de 30 caracteres (após trim; emoji conta 1)', async () => {
      await expectError(post({ name: 'a'.repeat(31), avatar: 'cat' }), 400, 'O nome deve ter no máximo 30 caracteres');
      await expectError(post({ name: '🚀'.repeat(31), avatar: 'cat' }), 400, 'O nome deve ter no máximo 30 caracteres');
    });

    test('400 | avatar ausente ou null', async () => {
      await expectError(post({ name: 'Ana' }), 400, 'O avatar é obrigatório');
      await expectError(post({ name: 'Ana', avatar: null }), 400, 'O avatar é obrigatório');
    });

    test('400 | avatar inválido ou não é texto', async () => {
      const msg = 'Avatar inválido. Use um destes: cat, dog, rocket, robot, ghost, star';
      await expectError(post({ name: 'Ana', avatar: 'unicorn' }), 400, msg);
      await expectError(post({ name: 'Ana', avatar: 7 }), 400, msg);
    });
  });

  describe('POST /api/links', () => {
    const post = (body) => request(app).post('/api/links').send(body);

    test('400 | url ausente ou null (inclui corpo vazio ou não-JSON)', async () => {
      const msg = 'A URL é obrigatória';
      await expectError(post({ userId: user.id }), 400, msg);
      await expectError(post({ userId: user.id, url: null }), 400, msg);
      await expectError(request(app).post('/api/links'), 400, msg);
      await expectError(
        request(app).post('/api/links').set('Content-Type', 'text/plain').send('{"url":"https://a.com","userId":1}'),
        400,
        msg
      );
    });

    test('400 | url não é texto', async () => {
      await expectError(post({ userId: user.id, url: 123 }), 400, 'A URL deve ser um texto');
    });

    test('400 | url inválida (esquema não http/https, sem host, com espaço)', async () => {
      const msg = 'URL inválida. Use um endereço começando com http:// ou https://';
      await expectError(post({ userId: user.id, url: 'ftp://a.com' }), 400, msg);
      await expectError(post({ userId: user.id, url: 'https://' }), 400, msg);
      await expectError(post({ userId: user.id, url: 'https://a.com/a b' }), 400, msg);
    });

    test('400 | userId ausente ou null', async () => {
      await expectError(post({ url: 'https://a.com' }), 400, 'O userId é obrigatório');
      await expectError(post({ url: 'https://a.com', userId: null }), 400, 'O userId é obrigatório');
    });

    test('400 | userId não é inteiro ("1", 1.5, true…)', async () => {
      const msg = 'O userId deve ser um número inteiro';
      await expectError(post({ url: 'https://a.com', userId: '1' }), 400, msg);
      await expectError(post({ url: 'https://a.com', userId: 1.5 }), 400, msg);
      await expectError(post({ url: 'https://a.com', userId: true }), 400, msg);
    });

    test('404 | usuário não existe (inclui 0 e negativos)', async () => {
      const msg = 'Usuário não encontrado';
      await expectError(post({ url: 'https://a.com', userId: 9999 }), 404, msg);
      await expectError(post({ url: 'https://a.com', userId: 0 }), 404, msg);
      await expectError(post({ url: 'https://a.com', userId: -1 }), 404, msg);
    });

    test('500 | código único não gerado após 5 tentativas', async () => {
      db.close();
      const gen = jest.fn(() => 'AAAAAA');
      setup({ generateCode: gen });
      expect((await post({ userId: user.id, url: 'https://a.com' })).status).toBe(201);
      gen.mockClear();
      await expectError(
        post({ userId: user.id, url: 'https://b.com' }),
        500,
        'Não foi possível gerar um código único. Tente novamente.'
      );
      expect(gen).toHaveBeenCalledTimes(5);
    });
  });

  describe('GET /api/users/:id/links', () => {
    test('404 | :id não é só dígitos ou acima de Number.MAX_SAFE_INTEGER', async () => {
      for (const id of ['abc', '1.5', '-1', '1e3', String(Number.MAX_SAFE_INTEGER + 1)]) {
        await expectError(request(app).get(`/api/users/${id}/links`), 404, 'Usuário não encontrado');
      }
    });

    test('404 | usuário não existe (inclui 0)', async () => {
      await expectError(request(app).get('/api/users/9999/links'), 404, 'Usuário não encontrado');
      await expectError(request(app).get('/api/users/0/links'), 404, 'Usuário não encontrado');
    });
  });

  describe('GET /:codigo', () => {
    test('404 | código no formato [A-Za-z0-9]{6}, mas inexistente', async () => {
      await expectError(request(app).get('/zZ9yY8'), 404, 'Link não encontrado');
    });

    test('404 | caminho fora do formato do código (/abc, /a-b_c1, /…) -> erro geral', async () => {
      for (const path of ['/abc', '/a-b_c1', '/']) {
        await expectError(request(app).get(path), 404, 'Rota não encontrada');
      }
    });
  });
});

describe('Contrato: comportamentos sem teste de rota', () => {
  let db;
  let app;

  beforeEach(() => {
    db = openDatabase(':memory:');
    app = createApp({ db });
  });

  afterEach(() => db.close());

  test('GET /:codigo/ (barra final) -> 302 com Location correta', async () => {
    const user = app.locals.repos.users.create({ name: 'Ana', avatar: 'cat' });
    const link = (await request(app).post('/api/links').send({ userId: user.id, url: 'https://exemplo.com/destino?x=1' })).body;
    const res = await request(app).get(`/${link.code}/`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://exemplo.com/destino?x=1');
  });

  test('GET /api/users com created_at igual desempata por id (ASC)', async () => {
    const insert = db.prepare('INSERT INTO users (name, avatar, created_at) VALUES (?, ?, ?)');
    const same = '2026-11-23T12:00:00.000Z';
    insert.run('Primeiro', 'cat', same);
    insert.run('Antigo', 'dog', '2026-11-01T00:00:00.000Z');
    insert.run('Segundo', 'star', same);
    insert.run('Terceiro', 'ghost', same);

    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body.map((u) => u.name)).toEqual(['Antigo', 'Primeiro', 'Segundo', 'Terceiro']);
  });
});
