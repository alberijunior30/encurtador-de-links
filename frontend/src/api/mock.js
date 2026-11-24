// Simulação da API no formato exato de API.md, persistida no localStorage.
// Imita as validações e mensagens do backend (400). Rejeita com { error: "mensagem" }.
import { MESSAGES, validateAvatar, validateName } from '../userRules.js';
import { toUserId } from '../activeUser.js';
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  HISTORY_MESSAGES,
  LINK_MESSAGES,
  SHORT_BASE_URL,
  validateUrl,
  validateUserId,
} from '../linkRules.js';

export const MOCK_USERS_KEY = 'mockUsers';
export const MOCK_LINKS_KEY = 'mockLinks';
export { MESSAGES };

function readList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

const readUsers = () => readList(MOCK_USERS_KEY);
const writeUsers = (users) => writeList(MOCK_USERS_KEY, users);
const readLinks = () => readList(MOCK_LINKS_KEY);
const writeLinks = (links) => writeList(MOCK_LINKS_KEY, links);

const nextId = (list) => list.reduce((max, item) => Math.max(max, item.id), 0) + 1;

function validate({ name, avatar }) {
  return validateName(name) ?? validateAvatar(avatar);
}

export async function createUser(input = {}) {
  const data = input && typeof input === 'object' ? input : {};
  const error = validate(data);
  if (error) throw { error };

  const users = readUsers();
  const id = nextId(users);
  const user = {
    id,
    name: data.name.trim(),
    avatar: data.avatar,
    createdAt: new Date().toISOString(),
  };
  writeUsers([...users, user]);
  return { ...user };
}

export async function listUsers() {
  return readUsers()
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
    .map((u) => ({ id: u.id, name: u.name, avatar: u.avatar, createdAt: u.createdAt }));
}

function randomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

// Pode ser trocado nos testes para forçar colisões.
export const codeGenerator = { next: randomCode };

const MAX_CODE_ATTEMPTS = 5;

export async function createLink(input = {}) {
  const data = input && typeof input === 'object' ? input : {};
  const { url, userId } = data;

  // Ordem do contrato: url, depois userId, depois usuário inexistente.
  const error = validateUrl(url) ?? validateUserId(userId);
  if (error) throw { error };
  if (!readUsers().some((u) => u.id === userId)) throw { error: LINK_MESSAGES.userNotFound };

  const links = readLinks();
  const used = new Set(links.map((l) => l.code));
  let code = null;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && code === null; attempt += 1) {
    const candidate = codeGenerator.next();
    if (!used.has(candidate)) code = candidate;
  }
  if (code === null) throw { error: LINK_MESSAGES.codeNotGenerated };

  const link = {
    id: nextId(links),
    code,
    shortUrl: SHORT_BASE_URL + code,
    originalUrl: url,
    userId,
    createdAt: new Date().toISOString(),
  };
  writeLinks([...links, link]);
  return { ...link };
}

const toLinkResponse = (l) => ({
  id: l.id,
  code: l.code,
  shortUrl: l.shortUrl,
  originalUrl: l.originalUrl,
  userId: l.userId,
  createdAt: l.createdAt,
});

// GET /api/users/:id/links — mais recente primeiro (empate de createdAt: id maior primeiro).
export async function listUserLinks(userId) {
  const id = toUserId(userId);
  if (id === null || !readUsers().some((u) => u.id === id)) {
    throw { error: HISTORY_MESSAGES.userNotFound };
  }
  return readLinks()
    .filter((l) => l.userId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
    .map(toLinkResponse);
}
