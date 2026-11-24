import { describe, expect, test } from 'vitest';
import { formatDateTime } from '../formatDate.js';

// Fuso fixo America/Sao_Paulo definido em vite.config.js para os testes.
describe('formatDateTime', () => {
  test('formata em pt-BR no fuso local', () => {
    expect(formatDateTime('2026-11-23T19:00:00.000Z')).toBe('23/11/2026, 16:00');
  });

  test('data inválida vira texto vazio', () => {
    expect(formatDateTime('não é data')).toBe('');
  });
});
