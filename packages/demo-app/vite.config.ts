import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
// SourceMap 上传插件（构建时自动上传到监控服务器）
import { viteSourceMapUploader } from '@monitor/plugins/vite';

export default defineConfig({
  plugins: [
    vue(),
    // 生产构建时启用 SourceMap 上传
    viteSourceMapUploader({
      serverUrl: 'http://localhost:3000',
      dsn: '756b3c5f06ce7b89',
      version: process.env.npm_package_version || '1.0.0',
      // 开发时可以设置为 false 方便调试
      deleteAfterUpload: true,
      verbose: true,
    }),
  ],
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
