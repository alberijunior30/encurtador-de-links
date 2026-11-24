// Persistência do usuário ativo no localStorage.
export const ACTIVE_USER_KEY = 'activeUserId';

// O localStorage guarda string ("1"); a API exige número inteiro (1).
// Mesma regra do :id em API.md (GET /api/users/:id/links): texto só com dígitos
// (zeros à esquerda valem: "01" -> 1); número só inteiro seguro e positivo.
// Qualquer outro valor -> null (tratado como sem usuário ativo).
export function toUserId(raw) {
  let id;
  if (typeof raw === 'string') {
    if (!/^\d+$/.test(raw)) return null;
    id = Number(raw);
  } else if (typeof raw === 'number') {
    id = raw;
  } else {
    return null;
  }
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function getActiveUserId() {
  return toUserId(localStorage.getItem(ACTIVE_USER_KEY));
}

export function setActiveUserId(id) {
  localStorage.setItem(ACTIVE_USER_KEY, String(id));
}

export function clearActiveUserId() {
  localStorage.removeItem(ACTIVE_USER_KEY);
}
