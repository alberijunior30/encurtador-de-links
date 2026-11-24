import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Fuso fixo nos testes para datas formatadas serem determinísticas.
if (process.env.VITEST) process.env.TZ = 'America/Sao_Paulo';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    // A suíte usa a simulação por padrão; a API real só é testada com fetch mockado.
    env: { VITE_USE_MOCK: 'true' },
  },
});
