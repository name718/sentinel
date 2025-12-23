/**
 * 监控服务器 API 客户端
 */
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import type { MonitorError, ErrorGroup, MonitorConfig } from './types';

export class MonitorAPI {
  private config: MonitorConfig;

  constructor(config: MonitorConfig) {
    this.config = config;
  }

  updateConfig(config: MonitorConfig) {
    this.config = config;
  }

  /**
   * 发送 HTTP 请求
   */
  private request<T>(path: string, params?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.config.serverUrl);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
      }

      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const req = httpModule.get(url.toString(), (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * 获取错误列表
   */
  async getErrors(options?: { startTime?: number; limit?: number }): Promise<MonitorError[]> {
    const params: Record<string, string> = {
      dsn: this.config.dsn,
      pageSize: String(options?.limit || 50),
    };

    if (options?.startTime) {
      params.startTime = String(options.startTime);
    }

    const response = await this.request<{ list: MonitorError[] }>('/api/errors', params);
    return response.list || [];
  }

  /**
   * 获取错误详情
   */
  async getErrorDetail(id: number): Promise<MonitorError> {
    return this.request<MonitorError>(`/api/errors/${id}`);
  }

  /**
   * 获取错误分组
   */
  async getErrorGroups(): Promise<ErrorGroup[]> {
    const params = {
      dsn: this.config.dsn,
      limit: '20',
    };

    const response = await this.request<{ groups: ErrorGroup[] }>('/api/errors/stats/groups', params);
    return response.groups || [];
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getErrors({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }
}
