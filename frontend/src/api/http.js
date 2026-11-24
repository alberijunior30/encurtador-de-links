// Implementação real da API (fetch). Rejeita sempre com { error: "mensagem" }.
import { toUserId } from '../activeUser.js';
import { HISTORY_MESSAGES } from '../linkRules.js';
export const API_BASE_URL = 'http://localhost:3000/api';

const NETWORK_ERROR = 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.';

async function request(path, options = {}) {
  let res;
  try {
    // Content-Type só quando há corpo: GET sai sem o cabeçalho.
    const init =
      options.body !== undefined
        ? { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }
        : options;
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw { error: NETWORK_ERROR };
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  // fetch não rejeita em 4xx/5xx: tratamos aqui.
  if (!res.ok) {
    const message =
      body && typeof body.error === 'string' ? body.error : `Erro inesperado do servidor (${res.status})`;
    throw { error: message };
  }
  if (body === null) {
    throw { error: 'Resposta inválida do servidor' };
  }
  return body;
}

export function createUser({ name, avatar }) {
  return request('/users', { method: 'POST', body: JSON.stringify({ name, avatar }) });
}

export function listUsers() {
  return request('/users');
}

// API_BASE_URL já inclui /api: o path aqui é só /links.
export function createLink({ userId, url }) {
  return request('/links', { method: 'POST', body: JSON.stringify({ userId, url }) });
}

// GET /api/users/:id/links. API_BASE_URL já inclui /api: o path é /users/:id/links.
export async function listUserLinks(userId) {
  const id = toUserId(userId);
  // id não inteiro: o backend responderia 404 "Usuário não encontrado"; nem chega a pedir.
  if (id === null) throw { error: HISTORY_MESSAGES.userNotFound };
  return request(`/users/${id}/links`);
}
