const AVATARS = ['cat', 'dog', 'rocket', 'robot', 'ghost', 'star'];
const NAME_MAX_LENGTH = 30;

const MESSAGES = {
  nameRequired: 'O nome é obrigatório',
  nameNotString: 'O nome deve ser um texto',
  nameEmpty: 'O nome não pode ficar vazio',
  nameTooLong: `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres`,
  avatarRequired: 'O avatar é obrigatório',
  avatarInvalid: `Avatar inválido. Use um destes: ${AVATARS.join(', ')}`,
};

/**
 * Valida o corpo de POST /api/users.
 * Retorna { error } ou { value: { name, avatar } } com o nome já com trim.
 * Corpo ausente/não-objeto (ex.: Content-Type não JSON) cai como campos ausentes.
 */
function validateCreateUser(body) {
  const data = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const { name, avatar } = data;

  if (name === undefined || name === null) return { error: MESSAGES.nameRequired };
  if (typeof name !== 'string') return { error: MESSAGES.nameNotString };

  const trimmed = name.trim();
  if (trimmed.length === 0) return { error: MESSAGES.nameEmpty };
  // Conta caracteres reais (code points), para emoji contar como 1.
  if (Array.from(trimmed).length > NAME_MAX_LENGTH) return { error: MESSAGES.nameTooLong };

  if (avatar === undefined || avatar === null) return { error: MESSAGES.avatarRequired };
  if (typeof avatar !== 'string' || !AVATARS.includes(avatar)) return { error: MESSAGES.avatarInvalid };

  return { value: { name: trimmed, avatar } };
}

module.exports = { validateCreateUser, AVATARS, NAME_MAX_LENGTH, MESSAGES };
