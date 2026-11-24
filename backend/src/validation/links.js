const MESSAGES = {
  urlRequired: 'A URL é obrigatória',
  urlNotString: 'A URL deve ser um texto',
  urlInvalid: 'URL inválida. Use um endereço começando com http:// ou https://',
  userIdRequired: 'O userId é obrigatório',
  userIdNotInteger: 'O userId deve ser um número inteiro',
  userNotFound: 'Usuário não encontrado',
  codeGenerationFailed: 'Não foi possível gerar um código único. Tente novamente.',
};

const SCHEME = /^https?:\/\//i;
const WHITESPACE = /\s/;

function isValidUrl(value) {
  // Sem trim: qualquer espaço (nas pontas ou no meio) torna a URL inválida.
  if (WHITESPACE.test(value) || !SCHEME.test(value)) return false;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname !== '';
}

/**
 * Valida o corpo de POST /api/links na ordem do contrato: url primeiro, depois userId.
 * Retorna { error } ou { value: { url, userId } } com a url exatamente como recebida.
 */
function validateCreateLink(body) {
  const data = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const { url, userId } = data;

  if (url === undefined || url === null) return { error: MESSAGES.urlRequired };
  if (typeof url !== 'string') return { error: MESSAGES.urlNotString };
  if (!isValidUrl(url)) return { error: MESSAGES.urlInvalid };

  if (userId === undefined || userId === null) return { error: MESSAGES.userIdRequired };
  if (!Number.isInteger(userId)) return { error: MESSAGES.userIdNotInteger };

  return { value: { url, userId } };
}

module.exports = { validateCreateLink, isValidUrl, MESSAGES };
