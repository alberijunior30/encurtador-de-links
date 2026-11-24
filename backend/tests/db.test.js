const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDatabase } = require('../src/db/connection');
const { createRepositories } = require('../src/db/repositories');
const { createApp } = require('../src/app');

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function columns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => ({
    name: c.name,
    type: c.type,
    notnull: c.notnull,
    pk: c.pk,
  }));
}

describe('Banco SQLite', () => {
  let db;
  let repos;

  beforeEach(() => {
    db = openDatabase(':memory:');
    repos = createRepositories(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('schema', () => {
    test('cria a tabela users', () => {
      expect(columns(db, 'users')).toEqual([
        { name: 'id', type: 'INTEGER', notnull: 0, pk: 1 },
        { name: 'name', type: 'TEXT', notnull: 1, pk: 0 },
        { name: 'avatar', type: 'TEXT', notnull: 1, pk: 0 },
        { name: 'created_at', type: 'TEXT', notnull: 1, pk: 0 },
      ]);
    });

    test('cria a tabela links com FK para users', () => {
      expect(columns(db, 'links')).toEqual([
        { name: 'id', type: 'INTEGER', notnull: 0, pk: 1 },
        { name: 'code', type: 'TEXT', notnull: 1, pk: 0 },
        { name: 'original_url', type: 'TEXT', notnull: 1, pk: 0 },
        { name: 'user_id', type: 'INTEGER', notnull: 1, pk: 0 },
        { name: 'created_at', type: 'TEXT', notnull: 1, pk: 0 },
      ]);
      const [fk] = db.prepare('PRAGMA foreign_key_list(links)').all();
      expect(fk).toMatchObject({ table: 'users', from: 'user_id', to: 'id' });
    });

    test('ids são autoincrement', () => {
      const sql = db.prepare("SELECT sql FROM sqlite_master WHERE name IN ('users','links')").all();
      sql.forEach(({ sql: ddl }) => expect(ddl).toMatch(/AUTOINCREMENT/));
    });

    test('abrir de novo o mesmo arquivo não quebra (schema idempotente) e respeita DB_PATH', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'encurtador-'));
      const file = path.join(dir, 'teste.sqlite');
      const previous = process.env.DB_PATH;
      process.env.DB_PATH = file;
      try {
        const first = openDatabase();
        createRepositories(first).users.create({ name: 'Ana', avatar: 'cat' });
        first.close();

        const second = openDatabase();
        expect(createRepositories(second).users.list()).toHaveLength(1);
        second.close();
        expect(fs.existsSync(file)).toBe(true);
      } finally {
        if (previous === undefined) delete process.env.DB_PATH;
        else process.env.DB_PATH = previous;
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('usuários', () => {
    test('insere e lê usuário em camelCase com data ISO', () => {
      const user = repos.users.create({ name: 'Alberi', avatar: 'rocket' });
      expect(user).toEqual({
        id: expect.any(Number),
        name: 'Alberi',
        avatar: 'rocket',
        createdAt: expect.stringMatching(ISO_8601),
      });
      expect(Number.isInteger(user.id)).toBe(true);
      expect(repos.users.findById(user.id)).toEqual(user);
    });

    test('findById de usuário inexistente devolve null', () => {
      expect(repos.users.findById(999)).toBeNull();
    });

    test('list devolve do mais antigo para o mais recente', () => {
      const a = repos.users.create({ name: 'A', avatar: 'cat' });
      const b = repos.users.create({ name: 'B', avatar: 'dog' });
      expect(repos.users.list().map((u) => u.id)).toEqual([a.id, b.id]);
    });
  });

  describe('links', () => {
    let user;

    beforeEach(() => {
      user = repos.users.create({ name: 'Alberi', avatar: 'rocket' });
    });

    test('insere e lê link em camelCase com data ISO (sem shortUrl)', () => {
      const link = repos.links.create({
        code: 'aB3xK9',
        originalUrl: 'https://www.exemplo.com/longo',
        userId: user.id,
      });
      expect(link).toEqual({
        id: expect.any(Number),
        code: 'aB3xK9',
        originalUrl: 'https://www.exemplo.com/longo',
        userId: user.id,
        createdAt: expect.stringMatching(ISO_8601),
      });
      expect(link).not.toHaveProperty('shortUrl');
      expect(repos.links.findByCode('aB3xK9')).toEqual(link);
    });

    test('findByCode de código inexistente devolve null', () => {
      expect(repos.links.findByCode('zzzzzz')).toBeNull();
    });

    test('code UNIQUE rejeita duplicata', () => {
      repos.links.create({ code: 'abc123', originalUrl: 'https://a.com', userId: user.id });
      expect(() =>
        repos.links.create({ code: 'abc123', originalUrl: 'https://b.com', userId: user.id })
      ).toThrow(expect.objectContaining({ code: 'SQLITE_CONSTRAINT_UNIQUE' }));
    });

    test('user_id precisa referenciar usuário existente', () => {
      expect(() =>
        repos.links.create({ code: 'abc123', originalUrl: 'https://a.com', userId: 999 })
      ).toThrow(expect.objectContaining({ code: 'SQLITE_CONSTRAINT_FOREIGNKEY' }));
    });

    test('listByUser devolve só os links do usuário, do mais recente para o mais antigo', () => {
      const other = repos.users.create({ name: 'Outro', avatar: 'ghost' });
      const l1 = repos.links.create({ code: 'aaaaa1', originalUrl: 'https://1.com', userId: user.id });
      const l2 = repos.links.create({ code: 'aaaaa2', originalUrl: 'https://2.com', userId: user.id });
      repos.links.create({ code: 'bbbbb1', originalUrl: 'https://3.com', userId: other.id });
      expect(repos.links.listByUser(user.id).map((l) => l.id)).toEqual([l2.id, l1.id]);
      expect(repos.links.listByUser(12345)).toEqual([]);
    });
  });

  test('createApp usa o banco injetado', () => {
    const app = createApp({ db });
    expect(app.locals.db).toBe(db);
    app.locals.repos.users.create({ name: 'Via app', avatar: 'star' });
    expect(repos.users.list()).toHaveLength(1);
  });
});
