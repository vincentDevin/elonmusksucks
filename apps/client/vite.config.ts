import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
  console.log('Vite running on 127.0.0.1:3000 with API and Socket.IO proxy');
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      strictPort: true,
      port: 3000,
      proxy: {
        // REST API requests
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        },
        // Socket.IO long polling/WebSocket
        '/socket.io': {
          target: 'http://127.0.0.1:5000',
          ws: true, // <--- IMPORTANT! This enables WebSocket proxying
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
