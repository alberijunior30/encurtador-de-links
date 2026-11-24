// Camada de acesso a dados: sempre devolve objetos no formato camelCase do contrato.
// O shortUrl NÃO é armazenado; é montado na camada de rota.

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    createdAt: row.created_at,
  };
}

function toLink(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    originalUrl: row.original_url,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

function createUsersRepository(db) {
  const insert = db.prepare('INSERT INTO users (name, avatar, created_at) VALUES (?, ?, ?)');
  const byId = db.prepare('SELECT * FROM users WHERE id = ?');
  const all = db.prepare('SELECT * FROM users ORDER BY created_at ASC, id ASC');

  return {
    create({ name, avatar }) {
      const createdAt = new Date().toISOString();
      const { lastInsertRowid } = insert.run(name, avatar, createdAt);
      return toUser(byId.get(lastInsertRowid));
    },
    findById(id) {
      return toUser(byId.get(id));
    },
    list() {
      return all.all().map(toUser);
    },
  };
}

function createLinksRepository(db) {
  const insert = db.prepare(
    'INSERT INTO links (code, original_url, user_id, created_at) VALUES (?, ?, ?, ?)'
  );
  const byId = db.prepare('SELECT * FROM links WHERE id = ?');
  const byCode = db.prepare('SELECT * FROM links WHERE code = ?');
  const byUser = db.prepare(
    'SELECT * FROM links WHERE user_id = ? ORDER BY created_at DESC, id DESC'
  );

  return {
    create({ code, originalUrl, userId }) {
      const createdAt = new Date().toISOString();
      const { lastInsertRowid } = insert.run(code, originalUrl, userId, createdAt);
      return toLink(byId.get(lastInsertRowid));
    },
    findByCode(code) {
      return toLink(byCode.get(code));
    },
    listByUser(userId) {
      return byUser.all(userId).map(toLink);
    },
  };
}

function createRepositories(db) {
  return {
    users: createUsersRepository(db),
    links: createLinksRepository(db),
  };
}

module.exports = { createRepositories, toUser, toLink };
