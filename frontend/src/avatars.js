// Único lugar com o mapeamento avatar (string do contrato) -> emoji.
// A ordem segue a lista de avatares permitidos em API.md.
export const AVATARS = {
  cat: '🐱',
  dog: '🐶',
  rocket: '🚀',
  robot: '🤖',
  ghost: '👻',
  star: '⭐',
};

export const AVATAR_KEYS = Object.keys(AVATARS);

export function avatarEmoji(key) {
  return AVATARS[key] ?? '❔';
}
