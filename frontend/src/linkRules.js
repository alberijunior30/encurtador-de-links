// Regras e mensagens de link (usadas pela simulação e pelo formulário de encurtar).
// Mensagens copiadas de API.md, seção "POST /api/links — Encurtar URL", tabela "Erros".
export const LINK_MESSAGES = {
  urlRequired: 'A URL é obrigatória',
  urlNotString: 'A URL deve ser um texto',
  urlInvalid: 'URL inválida. Use um endereço começando com http:// ou https://',
  userIdRequired: 'O userId é obrigatório',
  userIdNotInteger: 'O userId deve ser um número inteiro',
  userNotFound: 'Usuário não encontrado',
  codeNotGenerated: 'Não foi possível gerar um código único. Tente novamente.',
};

// Mensagens copiadas de API.md, seção "GET /api/users/:id/links — Histórico do usuário", tabela "Erros".
export const HISTORY_MESSAGES = {
  userNotFound: 'Usuário não encontrado',
};

export const SHORT_BASE_URL = 'http://localhost:3000/';
export const CODE_LENGTH = 6;
export const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// URL válida: esquema http/https (case-insensitive), sem nenhum espaço, aceita por new URL() e com host.
// Sem trim: a URL é guardada exatamente como enviada.
export function isValidUrl(url) {
  if (!/^https?:\/\//i.test(url)) return false;
  if (/\s/.test(url)) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname !== '';
}

// Valida só a URL. Retorna a mensagem ou null.
export function validateUrl(url) {
  if (url === undefined || url === null) return LINK_MESSAGES.urlRequired;
  if (typeof url !== 'string') return LINK_MESSAGES.urlNotString;
  if (!isValidUrl(url)) return LINK_MESSAGES.urlInvalid;
  return null;
}

// Valida o tipo do userId (a existência do usuário é checada depois). Retorna a mensagem ou null.
export function validateUserId(userId) {
  if (userId === undefined || userId === null) return LINK_MESSAGES.userIdRequired;
  if (typeof userId !== 'number' || !Number.isInteger(userId)) return LINK_MESSAGES.userIdNotInteger;
  return null;
}
