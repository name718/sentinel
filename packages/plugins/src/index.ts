/**
 * @monitor/plugins
 * 
 * Vite & Webpack 插件，用于在构建时自动上传 SourceMap 到监控服务器
 * 
 * @example Vite
 * ```ts
 * import { viteSourceMapUploader } from '@monitor/plugins/vite';
 * 
 * export default defineConfig({
 *   build: { sourcemap: true },
 *   plugins: [
 *     viteSourceMapUploader({
 *       serverUrl: 'http://localhost:3000',
 *       dsn: 'my-app',
 *       version: '1.0.0',
 *     }),
 *   ],
 * });
 * ```
 * 
 * @example Webpack
 * ```js
 * const { WebpackSourceMapUploader } = require('@monitor/plugins/webpack');
 * 
 * module.exports = {
 *   devtool: 'source-map',
 *   plugins: [
 *     new WebpackSourceMapUploader({
 *       serverUrl: 'http://localhost:3000',
 *       dsn: 'my-app',
 *       version: '1.0.0',
 *     }),
 *   ],
 * };
 * ```
 */

// Vite 插件
export { viteSourceMapUploader } from './vite';

// Webpack 插件
export { WebpackSourceMapUploader } from './webpack';

// 类型
export type { SourceMapUploaderOptions, UploadResult, SourceMapFile } from './types';

// 工具函数（高级用法）
export { uploadSourceMaps, collectSourceMaps, shouldUpload, getVersion } from './uploader';
