// Ponto ÚNICO de troca entre simulação e API real.
// Os componentes importam só deste arquivo.
// Padrão: API REAL (http://localhost:3000/api, ver src/api/http.js).
// Simulação (localStorage): rode com VITE_USE_MOCK=true (ex.: `VITE_USE_MOCK=true npm run dev`).
// Os testes forçam a simulação via test.env em vite.config.js.
import * as mock from './mock.js';
import * as http from './http.js';

// Só o valor exato 'true' liga a simulação; ausente ou qualquer outro valor -> API real.
export function shouldUseMock(value) {
  return value === 'true';
}

export const USE_MOCK = shouldUseMock(import.meta.env.VITE_USE_MOCK);

const impl = USE_MOCK ? mock : http;

export const createUser = (data) => impl.createUser(data);
export const listUsers = () => impl.listUsers();
export const createLink = (data) => impl.createLink(data);
export const listUserLinks = (userId) => impl.listUserLinks(userId);
