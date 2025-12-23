/**
 * SourceMap 上传核心逻辑
 */
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import type { SourceMapUploaderOptions, UploadResult, SourceMapFile } from './types';

const PLUGIN_NAME = '@monitor/sourcemap-uploader';

/**
 * 日志工具
 */
function createLogger(verbose: boolean) {
  return {
    info: (msg: string) => console.log(`[${PLUGIN_NAME}] ${msg}`),
    success: (msg: string) => console.log(`[${PLUGIN_NAME}] ✅ ${msg}`),
    warn: (msg: string) => console.warn(`[${PLUGIN_NAME}] ⚠️ ${msg}`),
    error: (msg: string) => console.error(`[${PLUGIN_NAME}] ❌ ${msg}`),
    debug: (msg: string) => verbose && console.log(`[${PLUGIN_NAME}] 🔍 ${msg}`),
  };
}

/**
 * 获取版本号
 */
export function getVersion(version: string | (() => string)): string {
  return typeof version === 'function' ? version() : version;
}

/**
 * 检查文件是否应该上传
 */
export function shouldUpload(
  filename: string,
  include?: RegExp | ((filename: string) => boolean),
  exclude?: RegExp | ((filename: string) => boolean)
): boolean {
  // 必须是 .map 文件
  if (!filename.endsWith('.map')) {
    return false;
  }

  // 检查排除规则
  if (exclude) {
    if (typeof exclude === 'function') {
      if (exclude(filename)) return false;
    } else if (exclude.test(filename)) {
      return false;
    }
  }

  // 检查包含规则
  if (include) {
    if (typeof include === 'function') {
      return include(filename);
    }
    return include.test(filename);
  }

  return true;
}

/**
 * 收集输出目录中的 SourceMap 文件
 */
export function collectSourceMaps(
  outputDir: string,
  options: SourceMapUploaderOptions
): SourceMapFile[] {
  const files: SourceMapFile[] = [];
  const logger = createLogger(options.verbose ?? false);

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) {
      logger.warn(`Output directory not found: ${dir}`);
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && shouldUpload(entry.name, options.include, options.exclude)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          // 验证是有效的 JSON
          JSON.parse(content);
          files.push({
            filename: entry.name,
            content,
            path: fullPath,
          });
          logger.debug(`Found SourceMap: ${entry.name}`);
        } catch (e) {
          logger.warn(`Invalid SourceMap file: ${entry.name}`);
        }
      }
    }
  }

  scanDir(outputDir);
  return files;
}

/**
 * 上传单个 SourceMap 文件
 */
function uploadFile(
  file: SourceMapFile,
  options: SourceMapUploaderOptions,
  version: string
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const url = new URL('/api/sourcemap', options.serverUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    // 构建 multipart/form-data
    const boundary = `----FormBoundary${Date.now()}`;
    const parts: string[] = [];

    // DSN 字段
    parts.push(`--${boundary}`);
    parts.push('Content-Disposition: form-data; name="dsn"');
    parts.push('');
    parts.push(options.dsn);

    // Version 字段
    parts.push(`--${boundary}`);
    parts.push('Content-Disposition: form-data; name="version"');
    parts.push('');
    parts.push(version);

    // File 字段
    parts.push(`--${boundary}`);
    parts.push(`Content-Disposition: form-data; name="file"; filename="${file.filename}"`);
    parts.push('Content-Type: application/json');
    parts.push('');
    parts.push(file.content);

    parts.push(`--${boundary}--`);

    const body = parts.join('\r\n');

    const requestOptions: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body),
        ...options.headers,
      },
      timeout: options.timeout ?? 30000,
    };

    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ filename: file.filename, success: true });
        } else {
          resolve({
            filename: file.filename,
            success: false,
            error: `HTTP ${res.statusCode}: ${data}`,
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        filename: file.filename,
        success: false,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        filename: file.filename,
        success: false,
        error: 'Request timeout',
      });
    });

    req.write(body);
    req.end();
  });
}

/**
 * 批量上传 SourceMap 文件
 */
export async function uploadSourceMaps(
  files: SourceMapFile[],
  options: SourceMapUploaderOptions
): Promise<UploadResult[]> {
  const logger = createLogger(options.verbose ?? false);
  const version = getVersion(options.version);

  if (files.length === 0) {
    logger.warn('No SourceMap files found to upload');
    return [];
  }

  logger.info(`Uploading ${files.length} SourceMap file(s) to ${options.serverUrl}`);
  logger.info(`DSN: ${options.dsn}, Version: ${version}`);

  const results: UploadResult[] = [];

  // 并行上传（最多 5 个并发）
  const concurrency = 5;
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((file) => uploadFile(file, options, version))
    );
    results.push(...batchResults);
  }

  // 统计结果
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  if (successCount > 0) {
    logger.success(`Uploaded ${successCount} file(s) successfully`);
  }
  if (failCount > 0) {
    logger.error(`Failed to upload ${failCount} file(s)`);
    results
      .filter((r) => !r.success)
      .forEach((r) => logger.error(`  - ${r.filename}: ${r.error}`));
  }

  // 删除本地文件
  if (options.deleteAfterUpload !== false) {
    for (const file of files) {
      const result = results.find((r) => r.filename === file.filename);
      if (result?.success) {
        try {
          fs.unlinkSync(file.path);
          logger.debug(`Deleted local file: ${file.filename}`);
        } catch (e) {
          logger.warn(`Failed to delete: ${file.filename}`);
        }
      }
    }
  }

  // 回调
  if (successCount > 0 && options.onSuccess) {
    options.onSuccess(results.filter((r) => r.success));
  }
  if (failCount > 0 && options.onError) {
    options.onError(
      new Error(`Failed to upload ${failCount} file(s)`),
      results.filter((r) => !r.success).map((r) => r.filename)
    );
  }

  return results;
}
