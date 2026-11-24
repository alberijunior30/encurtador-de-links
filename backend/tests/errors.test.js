const zlib = require('node:zlib');
const request = require('supertest');
const { createApp } = require('../src/app');
const { openDatabase } = require('../src/db/connection');
const { errorHandler, BODY_PARSER_MESSAGES } = require('../src/middlewares/errors');

describe('Mensagens de erro do body-parser em português', () => {
  let db;
  let app;

  beforeEach(() => {
    db = openDatabase(':memory:');
    app = createApp({ db });
  });

  afterEach(() => db.close());

  test('corpo grande demais -> 413', async () => {
    const big = JSON.stringify({ texto: 'x'.repeat(200 * 1024) });
    const res = await request(app).post('/api/users').set('Content-Type', 'application/json').send(big);
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'Corpo da requisição grande demais' });
  });

  test('charset não suportado -> 415', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json; charset=latin1')
      .send('{"name":"Ana"}');
    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: 'Charset não suportado; use utf-8' });
  });

  test('Content-Encoding não suportado -> 415', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'xyz')
      .send('{"name":"Ana"}');
    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: 'Codificação de conteúdo não suportada' });
  });

  test('gzip válido continua sendo aceito (não vira erro)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'gzip')
      .serialize((body) => body)
      .send(zlib.gzipSync('{"name":"Ana"}'));
    // O corpo foi descomprimido e lido: o name passou e a validação parou no avatar.
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'O avatar é obrigatório' });
  });

  describe('handler central (unitário)', () => {
    function run(err) {
      const res = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
      };
      errorHandler(err, {}, res, () => {});
      return res;
    }

    test.each(Object.entries(BODY_PARSER_MESSAGES))('tipo %s usa a mensagem traduzida', (type, message) => {
      const err = Object.assign(new Error('english message'), { type, status: 400 });
      expect(run(err)).toMatchObject({ statusCode: 400, body: { error: message } });
    });

    test('4xx desconhecido mantém o status e não vaza mensagem em inglês', () => {
      const err = Object.assign(new Error('Unsupported Media Type'), { status: 415 });
      expect(run(err)).toMatchObject({ statusCode: 415, body: { error: 'Tipo de conteúdo não suportado' } });
    });

    test('erro sem status vira 500 genérico', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(run(new Error('boom'))).toMatchObject({ statusCode: 500, body: { error: 'Erro interno do servidor' } });
      spy.mockRestore();
    });
  });
});
