// API 配置
// 开发环境使用代理，生产环境使用环境变量
export const API_BASE = import.meta.env.VITE_API_URL || '/api';
