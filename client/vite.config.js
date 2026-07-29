import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 相对路径：同时兼容 GitHub Pages 子路径与本地根路径
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8787,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8788'
    }
  },
  build: {
    outDir: 'dist'
  }
});
