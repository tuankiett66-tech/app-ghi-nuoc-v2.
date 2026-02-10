
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cau hinh Vite giup Vercel nhan dien plugin React dung cach
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    port: 3000,
    host: true
  }
});
