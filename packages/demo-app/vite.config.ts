import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // SDK 源码直接引用，修改后自动热更新
      '@monitor/sdk': path.resolve(__dirname, '../sdk/src/index.ts')
    }
  },
  build: {
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js'
      }
    }
  },
  server: {
    port: 5173
  }
});
