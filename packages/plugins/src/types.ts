/**
 * SourceMap 上传插件配置
 */
export interface SourceMapUploaderOptions {
  /**
   * 监控服务器地址
   * @example 'http://localhost:3000'
   */
  serverUrl: string;

  /**
   * 项目标识符 (Data Source Name)
   * @example 'my-app'
   */
  dsn: string;

  /**
   * 版本号，用于关联 SourceMap
   * 可以是固定值或函数返回值
   * @example '1.0.0' 或 () => process.env.VERSION
   */
  version: string | (() => string);

  /**
   * 是否在上传后删除本地 SourceMap 文件
   * @default true
   */
  deleteAfterUpload?: boolean;

  /**
   * 是否启用插件
   * @default true
   */
  enabled?: boolean;

  /**
   * 上传超时时间（毫秒）
   * @default 30000
   */
  timeout?: number;

  /**
   * 是否显示详细日志
   * @default false
   */
  verbose?: boolean;

  /**
   * 自定义请求头
   */
  headers?: Record<string, string>;

  /**
   * 文件过滤器，返回 true 表示上传该文件
   * @default 默认上传所有 .map 文件
   */
  include?: RegExp | ((filename: string) => boolean);

  /**
   * 排除的文件
   */
  exclude?: RegExp | ((filename: string) => boolean);

  /**
   * 上传成功回调
   */
  onSuccess?: (files: UploadResult[]) => void;

  /**
   * 上传失败回调
   */
  onError?: (error: Error, files: string[]) => void;
}

export interface UploadResult {
  filename: string;
  success: boolean;
  error?: string;
}

export interface SourceMapFile {
  filename: string;
  content: string;
  path: string;
}
