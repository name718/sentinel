/**
 * 错误聚合算法服务
 * 
 * 核心思想：
 * 1. 基于错误特征生成指纹（fingerprint），相同指纹的错误被视为同一类错误
 * 2. 指纹生成考虑多个维度：错误类型、消息模式、堆栈特征
 * 3. 支持消息模板化，将动态内容（如 ID、数字）替换为占位符
 * 
 * 聚合策略：
 * - 相同指纹的错误合并为一条记录，增加 count 计数
 * - 保留首次出现时间和最后出现时间
 * - 保留最近的 breadcrumbs 用于调试
 */

import * as crypto from 'crypto';

export interface ErrorEvent {
  type: string;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  url: string;
  timestamp: number;
  breadcrumbs?: unknown[];
}

export interface FingerprintResult {
  fingerprint: string;
  normalizedMessage: string;
  stackSignature: string | null;
}

/**
 * 生成错误指纹
 * 
 * 算法步骤：
 * 1. 规范化错误消息（替换动态内容）
 * 2. 提取堆栈签名（取前3帧的函数名和文件名）
 * 3. 组合 type + normalizedMessage + stackSignature 生成 SHA256 哈希
 */
export function generateFingerprint(error: ErrorEvent): FingerprintResult {
  // 1. 规范化消息
  const normalizedMessage = normalizeMessage(error.message);
  
  // 2. 提取堆栈签名
  const stackSignature = error.stack ? extractStackSignature(error.stack) : null;
  
  // 3. 生成指纹
  const parts = [
    error.type,
    normalizedMessage,
    stackSignature || '',
    error.filename || ''
  ].join('::');
  
  const fingerprint = crypto.createHash('sha256').update(parts).digest('hex').substring(0, 16);
  
  return {
    fingerprint,
    normalizedMessage,
    stackSignature
  };
}

/**
 * 规范化错误消息
 * 
 * 将动态内容替换为占位符，使相似错误能够聚合：
 * - 数字 ID → <id>
 * - UUID → <uuid>
 * - 邮箱 → <email>
 * - URL 路径参数 → <param>
 * - 时间戳 → <timestamp>
 * - IP 地址 → <ip>
 * - 文件路径中的哈希 → <hash>
 */
export function normalizeMessage(message: string): string {
  if (!message) return '';
  
  let normalized = message;
  
  // UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  normalized = normalized.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '<uuid>'
  );
  
  // 邮箱地址
  normalized = normalized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '<email>'
  );
  
  // IP 地址
  normalized = normalized.replace(
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    '<ip>'
  );
  
  // 文件名中的哈希（如 main-abc123.js）
  normalized = normalized.replace(
    /([a-zA-Z0-9_-]+)-[a-f0-9]{6,}(\.[a-z]+)/gi,
    '$1-<hash>$2'
  );
  
  // 时间戳（13位毫秒级）
  normalized = normalized.replace(/\b1[0-9]{12}\b/g, '<timestamp>');
  
  // 纯数字 ID（4位以上）
  normalized = normalized.replace(/\b\d{4,}\b/g, '<id>');
  
  // URL 中的查询参数值
  normalized = normalized.replace(/([?&][a-zA-Z_]+)=[^&\s]+/g, '$1=<value>');
  
  // 引号内的长字符串（可能是动态数据）
  normalized = normalized.replace(/"[^"]{50,}"/g, '"<data>"');
  normalized = normalized.replace(/'[^']{50,}'/g, "'<data>'");
  
  return normalized.trim();
}

/**
 * 提取堆栈签名
 * 
 * 从堆栈信息中提取关键帧，生成稳定的签名：
 * 1. 解析堆栈帧
 * 2. 过滤掉第三方库和浏览器内部帧
 * 3. 取前 3 个有效帧的函数名和文件名
 * 4. 组合成签名字符串
 */
export function extractStackSignature(stack: string): string {
  const frames = parseStackFrames(stack);
  
  // 过滤掉不相关的帧
  const relevantFrames = frames.filter(frame => {
    // 排除 node_modules
    if (frame.file?.includes('node_modules')) return false;
    // 排除浏览器内部
    if (frame.file?.startsWith('native')) return false;
    if (frame.file?.includes('<anonymous>')) return false;
    // 排除 webpack 运行时
    if (frame.file?.includes('webpack')) return false;
    return true;
  });
  
  // 取前 3 帧
  const topFrames = relevantFrames.slice(0, 3);
  
  // 生成签名
  const signature = topFrames.map(frame => {
    const func = frame.function || 'anonymous';
    const file = frame.file ? normalizeFilename(frame.file) : 'unknown';
    return `${func}@${file}`;
  }).join(' > ');
  
  return signature || 'unknown';
}

/**
 * 解析堆栈帧
 * 支持 Chrome、Firefox、Safari 格式
 */
interface StackFrame {
  function?: string;
  file?: string;
  line?: number;
  column?: number;
}

function parseStackFrames(stack: string): StackFrame[] {
  const lines = stack.split('\n');
  const frames: StackFrame[] = [];
  
  for (const line of lines) {
    const frame = parseStackLine(line);
    if (frame) {
      frames.push(frame);
    }
  }
  
  return frames;
}

function parseStackLine(line: string): StackFrame | null {
  // Chrome 格式: "    at functionName (file:line:column)"
  const chromeMatch = line.match(/^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
  if (chromeMatch) {
    return {
      function: chromeMatch[1] || undefined,
      file: chromeMatch[2],
      line: parseInt(chromeMatch[3], 10),
      column: parseInt(chromeMatch[4], 10)
    };
  }
  
  // Firefox 格式: "functionName@file:line:column"
  const firefoxMatch = line.match(/^(.+?)@(.+?):(\d+):(\d+)$/);
  if (firefoxMatch) {
    return {
      function: firefoxMatch[1] || undefined,
      file: firefoxMatch[2],
      line: parseInt(firefoxMatch[3], 10),
      column: parseInt(firefoxMatch[4], 10)
    };
  }
  
  return null;
}

/**
 * 规范化文件名
 * 移除动态部分（如哈希、版本号）
 */
function normalizeFilename(filename: string): string {
  // 移除查询参数
  let normalized = filename.split('?')[0];
  
  // 移除文件名中的哈希
  normalized = normalized.replace(/-[a-f0-9]{6,}\./gi, '.');
  normalized = normalized.replace(/\.[a-f0-9]{6,}\./gi, '.');
  
  // 只保留文件名，不要完整路径
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
}

/**
 * 计算两个错误的相似度
 * 用于更精细的聚合判断
 * 
 * @returns 0-1 之间的相似度分数
 */
export function calculateSimilarity(error1: ErrorEvent, error2: ErrorEvent): number {
  let score = 0;
  let weight = 0;
  
  // 类型相同 (权重 30%)
  if (error1.type === error2.type) {
    score += 0.3;
  }
  weight += 0.3;
  
  // 消息相似度 (权重 40%)
  const msgSimilarity = stringSimilarity(
    normalizeMessage(error1.message),
    normalizeMessage(error2.message)
  );
  score += msgSimilarity * 0.4;
  weight += 0.4;
  
  // 堆栈相似度 (权重 30%)
  if (error1.stack && error2.stack) {
    const stack1 = extractStackSignature(error1.stack);
    const stack2 = extractStackSignature(error2.stack);
    const stackSimilarity = stringSimilarity(stack1, stack2);
    score += stackSimilarity * 0.3;
  }
  weight += 0.3;
  
  return score / weight;
}

/**
 * 简单的字符串相似度计算（Jaccard 相似度）
 */
function stringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;
  
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * 错误分组统计
 * 按指纹分组，返回每组的统计信息
 */
export interface ErrorGroup {
  fingerprint: string;
  type: string;
  message: string;
  normalizedMessage: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  affectedUrls: string[];
}

export function groupErrors(errors: ErrorEvent[]): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>();
  
  for (const error of errors) {
    const { fingerprint, normalizedMessage } = generateFingerprint(error);
    
    if (groups.has(fingerprint)) {
      const group = groups.get(fingerprint)!;
      group.count++;
      group.lastSeen = Math.max(group.lastSeen, error.timestamp);
      group.firstSeen = Math.min(group.firstSeen, error.timestamp);
      if (!group.affectedUrls.includes(error.url)) {
        group.affectedUrls.push(error.url);
      }
    } else {
      groups.set(fingerprint, {
        fingerprint,
        type: error.type,
        message: error.message,
        normalizedMessage,
        count: 1,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        affectedUrls: [error.url]
      });
    }
  }
  
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}
