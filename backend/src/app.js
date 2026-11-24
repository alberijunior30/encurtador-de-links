const express = require('express');
const cors = require('cors');
const { openDatabase } = require('./db/connection');
const { createRepositories } = require('./db/repositories');
const { notFoundHandler, errorHandler } = require('./middlewares/errors');
const usersRouter = require('./routes/users');
const { router: linksRouter } = require('./routes/links');
const { router: redirectRouter } = require('./routes/redirect');
const { generateCode: defaultGenerateCode } = require('./services/codeGenerator');

const FRONTEND_ORIGIN = 'http://localhost:5173';

/**
 * Cria o app Express. O banco é injetado (testes passam o próprio);
 * sem `db`, usa um banco em memória para não tocar no arquivo real.
 * `generateCode` é injetável para testar colisões de código.
 */
function createApp({ db = openDatabase(':memory:'), generateCode = defaultGenerateCode } = {}) {
  const app = express();

  app.locals.db = db;
  app.locals.repos = createRepositories(db);
  app.locals.generateCode = generateCode;

  app.use(cors({ origin: FRONTEND_ORIGIN }));
  app.use(express.json());

  app.use('/api/users', usersRouter);
  app.use('/api/links', linksRouter);

  // Fora de /api e depois dos routers da API, para nunca capturar /api/*.
  app.use(redirectRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp, FRONTEND_ORIGIN };
