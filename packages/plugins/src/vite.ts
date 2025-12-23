/**
 * Vite 插件 - 自动上传 SourceMap
 * 
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { viteSourceMapUploader } from '@monitor/plugins/vite';
 * 
 * export default defineConfig({
 *   build: {
 *     sourcemap: true, // 必须开启
 *   },
 *   plugins: [
 *     viteSourceMapUploader({
 *       serverUrl: 'http://localhost:3000',
 *       dsn: 'my-app',
 *       version: '1.0.0',
 *     }),
 *   ],
 * });
 * ```
 */
import * as path from 'path';
import type { Plugin, ResolvedConfig } from 'vite';
import type { SourceMapUploaderOptions } from './types';
import { collectSourceMaps, uploadSourceMaps } from './uploader';

const PLUGIN_NAME = 'vite-sourcemap-uploader';

/**
 * Vite SourceMap 上传插件
 */
export function viteSourceMapUploader(options: SourceMapUploaderOptions): Plugin {
  let config: ResolvedConfig;
  let outputDir: string;

  // 验证必填参数
  if (!options.serverUrl) {
    throw new Error(`[${PLUGIN_NAME}] serverUrl is required`);
  }
  if (!options.dsn) {
    throw new Error(`[${PLUGIN_NAME}] dsn is required`);
  }
  if (!options.version) {
    throw new Error(`[${PLUGIN_NAME}] version is required`);
  }

  return {
    name: PLUGIN_NAME,
    apply: 'build', // 仅在构建时生效

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      outputDir = path.resolve(config.root, config.build.outDir);
    },

    async closeBundle() {
      // 检查是否启用
      if (options.enabled === false) {
        console.log(`[${PLUGIN_NAME}] Plugin is disabled, skipping upload`);
        return;
      }

      // 检查是否开启了 sourcemap
      if (!config.build.sourcemap) {
        console.warn(`[${PLUGIN_NAME}] ⚠️ build.sourcemap is not enabled, skipping upload`);
        console.warn(`[${PLUGIN_NAME}] Please set build.sourcemap: true in vite.config.ts`);
        return;
      }

      // 收集 SourceMap 文件
      const files = collectSourceMaps(outputDir, options);

      // 上传
      await uploadSourceMaps(files, options);
    },
  };
}

// 默认导出
export default viteSourceMapUploader;

// 类型导出
export type { SourceMapUploaderOptions } from './types';
