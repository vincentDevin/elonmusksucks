import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const isProd = mode === 'production';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      port: 3000,
      proxy: {
        // REST API requests
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        },
        // Socket.IO long polling/WebSocket (main server)
        '/socket.io': {
          target: 'http://127.0.0.1:5000',
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      // ✅ SECURITY: Only enable source maps in development
      // Source maps expose your entire source code to attackers in production
      sourcemap: isDev,

      // ✅ SECURITY: Minification with Terser for production
      minify: isProd ? 'terser' : false,

      // ✅ SECURITY: Remove console statements and debugger in production
      terserOptions: isProd
        ? {
            compress: {
              drop_console: true, // Remove console.log, console.warn, etc.
              drop_debugger: true, // Remove debugger statements
              pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'], // Also remove these specific functions
            },
            format: {
              comments: false, // Remove comments from production build
            },
          }
        : undefined,

      // Performance optimizations
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'socket-vendor': ['socket.io-client'],
            'ui-vendor': ['react-hot-toast', 'react-icons'],
          },
        },
      },
    },
  };
});
