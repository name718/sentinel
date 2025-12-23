/**
 * @file SourceMap 解析服务
 * @description 将压缩后的错误堆栈还原为源码位置
 */

import { SourceMapConsumer, RawSourceMap } from 'source-map';
import { getDB } from '../db';

/** 解析后的堆栈帧 */
export interface ParsedStackFrame {
  originalFile: string | null;
  originalLine: number | null;
  originalColumn: number | null;
  originalName: string | null;
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
    const filename = extractFilename(frame.file);
    if (!filename) return result;

    const sourceMapContent = await getSourceMap(dsn, filename, version);
    if (!sourceMapContent) return result;

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

  try {
    let sql = 'SELECT content FROM sourcemaps WHERE dsn = $1 AND filename = $2';
    const params: (string | number)[] = [dsn, filename + '.map'];

    if (version) {
      sql += ' AND version = $3';
      params.push(version);
    } else {
      sql += ' ORDER BY created_at DESC LIMIT 1';
    }

    const result = await db.query(sql, params);
    if (result.rows.length > 0) {
      return result.rows[0].content;
    }
  } catch (error) {
    console.error('[SourceMap] Query error:', error);
  }

  return null;
}

/**
 * 解析堆栈字符串为结构化数据
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
 */
function parseStackLine(line: string): StackFrame | null {
  // Chrome 格式
  const chromeMatch = line.match(/at\s+(?:.*?\s+)?\(?(.+?):(\d+):(\d+)\)?$/);
  if (chromeMatch) {
    return {
      file: chromeMatch[1],
      line: parseInt(chromeMatch[2], 10),
      column: parseInt(chromeMatch[3], 10)
    };
  }

  // Firefox/Safari 格式
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
export async function saveSourceMap(
  dsn: string,
  version: string,
  filename: string,
  content: string
): Promise<boolean> {
  const db = getDB();
  if (!db) return false;

  try {
    // PostgreSQL 使用 ON CONFLICT 处理重复
    await db.query(`
      INSERT INTO sourcemaps (dsn, version, filename, content)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (dsn, version, filename) 
      DO UPDATE SET content = EXCLUDED.content, created_at = CURRENT_TIMESTAMP
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
export async function listSourceMaps(dsn: string): Promise<Array<{
  version: string;
  filename: string;
  createdAt: string;
}>> {
  const db = getDB();
  if (!db) return [];

  try {
    const result = await db.query(
      'SELECT version, filename, created_at FROM sourcemaps WHERE dsn = $1 ORDER BY created_at DESC',
      [dsn]
    );

    return result.rows.map(row => ({
      version: row.version,
      filename: row.filename,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('[SourceMap] List error:', error);
    return [];
  }
}
