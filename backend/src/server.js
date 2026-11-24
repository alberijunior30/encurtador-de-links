const { createApp } = require('./app');
const { openDatabase } = require('./db/connection');

const PORT = Number(process.env.PORT) || 3000;

const db = openDatabase();
const app = createApp({ db });

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
