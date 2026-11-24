// Regras e mensagens de usuário (usadas pela simulação e pelo formulário).
// Mensagens copiadas de API.md, seção "POST /api/users — Criar usuário", tabela "Erros".
import { AVATAR_KEYS } from './avatars.js';

export const NAME_MAX_LENGTH = 30;

export const MESSAGES = {
  nameRequired: 'O nome é obrigatório',
  nameNotString: 'O nome deve ser um texto',
  nameEmpty: 'O nome não pode ficar vazio',
  nameTooLong: `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres`,
  avatarRequired: 'O avatar é obrigatório',
  avatarInvalid: `Avatar inválido. Use um destes: ${AVATAR_KEYS.join(', ')}`,
};

// Conta caracteres como o backend: code points (emoji = 1).
export function nameLength(name) {
  return Array.from(name).length;
}

// Valida apenas o nome (já com trim). Retorna a mensagem ou null.
export function validateName(name) {
  if (name === undefined || name === null) return MESSAGES.nameRequired;
  if (typeof name !== 'string') return MESSAGES.nameNotString;
  const trimmed = name.trim();
  if (trimmed.length === 0) return MESSAGES.nameEmpty;
  if (nameLength(trimmed) > NAME_MAX_LENGTH) return MESSAGES.nameTooLong;
  return null;
}

export function validateAvatar(avatar) {
  if (avatar === undefined || avatar === null) return MESSAGES.avatarRequired;
  if (typeof avatar !== 'string' || !AVATAR_KEYS.includes(avatar)) return MESSAGES.avatarInvalid;
  return null;
}
