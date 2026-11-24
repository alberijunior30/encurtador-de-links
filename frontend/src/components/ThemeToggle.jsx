import { useEffect, useState } from 'react';
import {
  applyTheme,
  getInitialTheme,
  getStoredTheme,
  onSystemThemeChange,
  otherTheme,
  saveTheme,
} from '../theme.js';

const LABELS = {
  dark: { text: 'Ativar tema escuro', icon: '🌙' },
  light: { text: 'Ativar tema claro', icon: '☀️' },
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);
  // Enquanto o usuário não escolheu, o tema acompanha o sistema.
  const [userChose, setUserChose] = useState(() => getStoredTheme() !== null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (userChose) return undefined;
    return onSystemThemeChange(setTheme);
  }, [userChose]);

  function toggle() {
    const next = otherTheme(theme);
    saveTheme(next);
    setUserChose(true);
    setTheme(next);
  }

  const target = LABELS[otherTheme(theme)];
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={target.text} title={target.text}>
      <span aria-hidden="true">{target.icon}</span> {target.text}
    </button>
  );
}
