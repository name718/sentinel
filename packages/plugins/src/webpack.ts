/**
 * Webpack 插件 - 自动上传 SourceMap
 * 
 * @example
 * ```js
 * // webpack.config.js
 * const { WebpackSourceMapUploader } = require('@monitor/plugins/webpack');
 * 
 * module.exports = {
 *   devtool: 'source-map', // 必须开启
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
import * as path from 'path';
import type { Compiler, Compilation } from 'webpack';
import type { SourceMapUploaderOptions, SourceMapFile } from './types';
import { uploadSourceMaps, shouldUpload } from './uploader';

const PLUGIN_NAME = 'WebpackSourceMapUploader';

/**
 * Webpack SourceMap 上传插件
 */
export class WebpackSourceMapUploader {
  private options: SourceMapUploaderOptions;

  constructor(options: SourceMapUploaderOptions) {
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

    this.options = options;
  }

  apply(compiler: Compiler): void {
    const logger = compiler.getInfrastructureLogger(PLUGIN_NAME);

    compiler.hooks.afterEmit.tapAsync(PLUGIN_NAME, async (compilation: Compilation, callback) => {
      // 检查是否启用
      if (this.options.enabled === false) {
        logger.info('Plugin is disabled, skipping upload');
        callback();
        return;
      }

      // 检查是否开启了 sourcemap
      const devtool = compiler.options.devtool;
      if (!devtool || !devtool.toString().includes('source-map')) {
        logger.warn('devtool is not set to source-map, skipping upload');
        logger.warn('Please set devtool: "source-map" in webpack.config.js');
        callback();
        return;
      }

      try {
        // 从 compilation.assets 中收集 SourceMap 文件
        const files: SourceMapFile[] = [];
        const outputPath = compilation.outputOptions.path || compiler.outputPath;

        for (const [filename, asset] of Object.entries(compilation.assets)) {
          if (shouldUpload(filename, this.options.include, this.options.exclude)) {
            try {
              const content = asset.source().toString();
              // 验证是有效的 JSON
              JSON.parse(content);
              files.push({
                filename,
                content,
                path: path.join(outputPath, filename),
              });
              logger.debug(`Found SourceMap: ${filename}`);
            } catch (e) {
              logger.warn(`Invalid SourceMap file: ${filename}`);
            }
          }
        }

        if (files.length === 0) {
          logger.warn('No SourceMap files found to upload');
          callback();
          return;
        }

        // 上传
        const results = await uploadSourceMaps(files, this.options);

        // 删除 assets 中的 SourceMap（可选）
        if (this.options.deleteAfterUpload !== false) {
          for (const result of results) {
            if (result.success) {
              // 从 compilation.assets 中删除
              delete compilation.assets[result.filename];
              logger.debug(`Removed from assets: ${result.filename}`);
            }
          }
        }

        callback();
      } catch (error) {
        logger.error(`Upload failed: ${error}`);
        callback();
      }
    });
  }
}

// 默认导出
export default WebpackSourceMapUploader;

// 类型导出
export type { SourceMapUploaderOptions } from './types';
