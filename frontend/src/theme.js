// ÚNICO lugar com a regra do tema (apenas frontend; nada vai para a API).
// O script inline em index.html repete a regra de leitura para aplicar o tema
// antes da primeira pintura; se mudar aqui, mude lá também.
export const THEME_KEY = 'theme';
export const THEMES = ['light', 'dark'];
const DARK_QUERY = '(prefers-color-scheme: dark)';

function darkQuery() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(DARK_QUERY);
}

// Tema escolhido pelo usuário, ou null se não há escolha válida salva.
export function getStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return THEMES.includes(value) ? value : null;
  } catch {
    return null;
  }
}

// Preferência do sistema; sem matchMedia -> 'light'.
export function getSystemTheme() {
  return darkQuery()?.matches ? 'dark' : 'light';
}

export function getInitialTheme() {
  return getStoredTheme() ?? getSystemTheme();
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function otherTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

// Avisa quando a preferência do sistema muda. Retorna a função para parar de ouvir.
export function onSystemThemeChange(callback) {
  const mq = darkQuery();
  if (!mq) return () => {};
  const handler = (e) => callback(e.matches ? 'dark' : 'light');
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }
  mq.addListener?.(handler); // Safari antigo
  return () => mq.removeListener?.(handler);
}
