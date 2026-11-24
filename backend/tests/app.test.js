const request = require('supertest');
const { createApp, FRONTEND_ORIGIN } = require('../src/app');

describe('Estrutura do app', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  test('o app sobe e responde requisições', async () => {
    const res = await request(app).get('/api/rota-inexistente');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  describe('CORS', () => {
    test('libera a origem http://localhost:5173', async () => {
      const res = await request(app).get('/api/qualquer').set('Origin', FRONTEND_ORIGIN);
      expect(res.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN);
    });

    test('responde ao preflight (OPTIONS) da origem do frontend', async () => {
      const res = await request(app)
        .options('/api/users')
        .set('Origin', FRONTEND_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');
      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN);
      expect(res.headers['access-control-allow-methods']).toMatch(/POST/);
    });

    test('não libera outras origens', async () => {
      const res = await request(app).get('/api/qualquer').set('Origin', 'http://evil.example.com');
      expect(res.headers['access-control-allow-origin']).not.toBe('http://evil.example.com');
    });
  });

  describe('Handler de erro central', () => {
    test('JSON malformado retorna 400 no formato de erro padrão', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send('{"name": "Alberi",');
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({ error: expect.any(String) });
      expect(res.body.error.length).toBeGreaterThan(0);
    });
  });
});
