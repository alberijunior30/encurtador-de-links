import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { installFetchGuard, takeUnmockedCalls } from './test/fetchGuard.js';

installFetchGuard();

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  delete window.matchMedia;
  const calls = takeUnmockedCalls();
  if (calls.length > 0) {
    throw new Error(`fetch não mockado durante o teste (backend real é proibido nos testes): ${calls.join(', ')}`);
  }
});
