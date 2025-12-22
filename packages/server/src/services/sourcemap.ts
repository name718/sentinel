/**
 * @file SourceMap 解析服务
 * @description 将压缩后的错误堆栈还原为源码位置
 * 
 * ## 核心原理
 * SourceMap 是一个 JSON 文件，记录了压缩代码与源码的映射关系。
 * 通过 source-map 库可以根据压缩后的行号列号，反查出源码的文件名、行号、列号。
 * 
 * ## 使用流程
 * 1. 构建时生成 .map 文件
 * 2. 上传 .map 文件到服务端，关联版本号
 * 3. 错误发生时，根据堆栈中的文件名和位置查找对应的 SourceMap
 * 4. 使用 source-map 库解析出源码位置
 */

import { SourceMapConsumer, RawSourceMap } from 'source-map';
import { getDB } from '../db';

/** 解析后的堆栈帧 */
export interface ParsedStackFrame {
  originalFile: string | null;
  originalLine: number | null;
  originalColumn: number | null;
  originalName: string | null;
  // 原始信息
  file: string;
  line: number;
  column: number;
}

/** 堆栈帧信息 */
interface StackFrame {
  file: string;
  line: number;
  column: number;
}

/**
 * 解析错误堆栈
 * @param stack 原始堆栈字符串
 * @param dsn 项目标识
 * @param version 版本号（可选）
 */
export async function parseStack(
  stack: string,
  dsn: string,
  version?: string
): Promise<ParsedStackFrame[]> {
  const frames = parseStackString(stack);
  const results: ParsedStackFrame[] = [];

  for (const frame of frames) {
    const parsed = await parseFrame(frame, dsn, version);
    results.push(parsed);
  }

  return results;
}

/**
 * 解析单个堆栈帧
 */
async function parseFrame(
  frame: StackFrame,
  dsn: string,
  version?: string
): Promise<ParsedStackFrame> {
  const result: ParsedStackFrame = {
    file: frame.file,
    line: frame.line,
    column: frame.column,
    originalFile: null,
    originalLine: null,
    originalColumn: null,
    originalName: null
  };

  try {
    // 从文件名提取 .js 文件名
    const filename = extractFilename(frame.file);
    if (!filename) return result;

    // 查找对应的 SourceMap
    const sourceMapContent = await getSourceMap(dsn, filename, version);
    if (!sourceMapContent) return result;

    // 解析 SourceMap
    const rawSourceMap: RawSourceMap = JSON.parse(sourceMapContent);
    const consumer = await new SourceMapConsumer(rawSourceMap);

    try {
      const originalPosition = consumer.originalPositionFor({
        line: frame.line,
        column: frame.column
      });

      if (originalPosition.source) {
        result.originalFile = originalPosition.source;
        result.originalLine = originalPosition.line;
        result.originalColumn = originalPosition.column;
        result.originalName = originalPosition.name;
      }
    } finally {
      consumer.destroy();
    }
  } catch (error) {
    console.error('[SourceMap] Parse error:', error);
  }

  return result;
}

/**
 * 从 URL 提取文件名
 */
function extractFilename(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    const filename = parts[parts.length - 1];
    return filename.endsWith('.js') ? filename : null;
  } catch {
    // 可能不是完整 URL，尝试直接提取
    const match = url.match(/([^/]+\.js)(?:\?|$)/);
    return match ? match[1] : null;
  }
}

/**
 * 从数据库获取 SourceMap 内容
 */
async function getSourceMap(
  dsn: string,
  filename: string,
  version?: string
): Promise<string | null> {
  const db = getDB();
  if (!db) return null;

  // 构建查询，优先匹配指定版本，否则取最新
  let sql = 'SELECT content FROM sourcemaps WHERE dsn = ? AND filename = ?';
  const params: (string | number)[] = [dsn, filename + '.map'];

  if (version) {
    sql += ' AND version = ?';
    params.push(version);
  } else {
    sql += ' ORDER BY created_at DESC LIMIT 1';
  }

  const result = db.exec(sql, params);
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0] as string;
  }

  return null;
}

/**
 * 解析堆栈字符串为结构化数据
 * 支持 Chrome/Firefox/Safari 格式
 */
function parseStackString(stack: string): StackFrame[] {
  const frames: StackFrame[] = [];
  const lines = stack.split('\n');

  for (const line of lines) {
    const frame = parseStackLine(line);
    if (frame) {
      frames.push(frame);
    }
  }

  return frames;
}

/**
 * 解析单行堆栈
 * 
 * Chrome 格式:
 *   at functionName (http://example.com/app.js:10:20)
 *   at http://example.com/app.js:10:20
 * 
 * Firefox 格式:
 *   functionName@http://example.com/app.js:10:20
 * 
 * Safari 格式:
 *   functionName@http://example.com/app.js:10:20
 */
function parseStackLine(line: string): StackFrame | null {
  // Chrome 格式: at xxx (url:line:col) 或 at url:line:col
  const chromeMatch = line.match(/at\s+(?:.*?\s+)?\(?(.+?):(\d+):(\d+)\)?$/);
  if (chromeMatch) {
    return {
      file: chromeMatch[1],
      line: parseInt(chromeMatch[2], 10),
      column: parseInt(chromeMatch[3], 10)
    };
  }

  // Firefox/Safari 格式: xxx@url:line:col
  const firefoxMatch = line.match(/@(.+?):(\d+):(\d+)$/);
  if (firefoxMatch) {
    return {
      file: firefoxMatch[1],
      line: parseInt(firefoxMatch[2], 10),
      column: parseInt(firefoxMatch[3], 10)
    };
  }

  return null;
}

/**
 * 保存 SourceMap 到数据库
 */
export function saveSourceMap(
  dsn: string,
  version: string,
  filename: string,
  content: string
): boolean {
  const db = getDB();
  if (!db) return false;

  try {
    // 使用 INSERT OR REPLACE 处理重复
    db.run(`
      INSERT OR REPLACE INTO sourcemaps (dsn, version, filename, content)
      VALUES (?, ?, ?, ?)
    `, [dsn, version, filename, content]);
    return true;
  } catch (error) {
    console.error('[SourceMap] Save error:', error);
    return false;
  }
}

/**
 * 获取已上传的 SourceMap 列表
 */
export function listSourceMaps(dsn: string): Array<{
  version: string;
  filename: string;
  createdAt: string;
}> {
  const db = getDB();
  if (!db) return [];

  const result = db.exec(
    'SELECT version, filename, created_at FROM sourcemaps WHERE dsn = ? ORDER BY created_at DESC',
    [dsn]
  );

  if (result.length === 0) return [];

  return result[0].values.map(row => ({
    version: row[0] as string,
    filename: row[1] as string,
    createdAt: row[2] as string
  }));
}
