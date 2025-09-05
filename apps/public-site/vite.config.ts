import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    middlewareMode: true,
  },
  appType: 'custom',
  ssr: {
    format: 'esm',
    target: 'node',
  },
});
