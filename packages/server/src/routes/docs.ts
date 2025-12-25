/**
 * API 文档路由 - Swagger UI
 */
import { Router } from 'express';

const router = Router();

// OpenAPI 规范文档
const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Sentinel 前端监控 API',
    description: '前端错误监控、性能监控、用户行为追踪的 API 文档',
    version: '1.0.0',
    contact: {
      name: 'Sentinel Team',
      url: 'https://github.com/name718/sentinel'
    }
  },
  servers: [
    { url: '/api', description: '当前服务器' }
  ],
  tags: [
    { name: 'Auth', description: '用户认证' },
    { name: 'Projects', description: '项目管理' },
    { name: 'Report', description: 'SDK 数据上报' },
    { name: 'Errors', description: '错误管理' },
    { name: 'Performance', description: '性能数据' },
    { name: 'Alerts', description: '告警管理' },
    { name: 'SourceMap', description: 'SourceMap 管理' },
    { name: 'Health', description: '系统健康' }
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: '用户注册',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'code'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  code: { type: 'string', description: '邮箱验证码' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: '注册成功' },
          '400': { description: '参数错误或验证码无效' },
          '409': { description: '邮箱已存在' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: '用户登录',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: '登录成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          '401': { description: '密码错误' },
          '429': { description: '登录次数过多，账户已锁定' }
        }
      }
    },
    '/auth/send-code': {
      post: {
        tags: ['Auth'],
        summary: '发送验证码',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'type'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  type: { type: 'string', enum: ['register', 'reset-password'] }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: '验证码已发送' },
          '400': { description: '参数错误' }
        }
      }
    },
    '/projects': {
      get: {
        tags: ['Projects'],
        summary: '获取项目列表',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: '项目列表',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Project' }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Projects'],
        summary: '创建项目',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'platform'],
                properties: {
                  name: { type: 'string' },
                  platform: { type: 'string', enum: ['web', 'react-native', 'electron', 'node'] },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: '创建成功' }
        }
      }
    },
    '/report': {
      post: {
        tags: ['Report'],
        summary: '上报监控数据',
        description: 'SDK 使用此接口上报错误、性能、行为数据',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReportPayload' }
            }
          }
        },
        responses: {
          '200': { description: '上报成功' },
          '400': { description: '参数错误' }
        }
      }
    },
    '/errors': {
      get: {
        tags: ['Errors'],
        summary: '获取错误列表',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'dsn', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'startTime', in: 'query', schema: { type: 'integer' } },
          { name: 'endTime', in: 'query', schema: { type: 'integer' } }
        ],
        responses: {
          '200': {
            description: '错误列表',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    list: { type: 'array', items: { $ref: '#/components/schemas/Error' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    pageSize: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/errors/{id}': {
      get: {
        tags: ['Errors'],
        summary: '获取错误详情',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'version', in: 'query', schema: { type: 'string' }, description: '用于 SourceMap 解析' }
        ],
        responses: {
          '200': { description: '错误详情' }
        }
      }
    },
    '/errors/{id}/status': {
      patch: {
        tags: ['Errors'],
        summary: '更新错误状态',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['open', 'processing', 'resolved', 'ignored'] },
                  resolvedBy: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: '更新成功' }
        }
      }
    },
    '/errors/stats/groups': {
      get: {
        tags: ['Errors'],
        summary: '获取错误分组统计',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'dsn', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: '错误分组' }
        }
      }
    },
    '/performance': {
      get: {
        tags: ['Performance'],
        summary: '获取性能数据',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'dsn', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: '性能数据列表' }
        }
      }
    },
    '/alerts': {
      get: {
        tags: ['Alerts'],
        summary: '获取告警规则列表',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'dsn', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: '告警规则列表' }
        }
      },
      post: {
        tags: ['Alerts'],
        summary: '创建告警规则',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AlertRule' }
            }
          }
        },
        responses: {
          '201': { description: '创建成功' }
        }
      }
    },
    '/sourcemap/upload': {
      post: {
        tags: ['SourceMap'],
        summary: '上传 SourceMap 文件',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['dsn', 'version', 'file'],
                properties: {
                  dsn: { type: 'string' },
                  version: { type: 'string' },
                  file: { type: 'string', format: 'binary' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: '上传成功' }
        }
      }
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: '基础健康检查',
        responses: {
          '200': {
            description: '服务正常',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health/detailed': {
      get: {
        tags: ['Health'],
        summary: '详细健康检查',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: '详细系统状态',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthStatus' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          dsn: { type: 'string' },
          platform: { type: 'string' },
          description: { type: 'string' },
          error_count: { type: 'integer' },
          perf_count: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          type: { type: 'string' },
          message: { type: 'string' },
          stack: { type: 'string' },
          url: { type: 'string' },
          timestamp: { type: 'integer' },
          fingerprint: { type: 'string' },
          status: { type: 'string', enum: ['open', 'processing', 'resolved', 'ignored'] },
          count: { type: 'integer' }
        }
      },
      ReportPayload: {
        type: 'object',
        required: ['dsn', 'type'],
        properties: {
          dsn: { type: 'string', description: '项目 DSN' },
          type: { type: 'string', enum: ['error', 'performance', 'behavior', 'resource'] },
          data: { type: 'object', description: '上报数据' },
          breadcrumbs: { type: 'array', items: { type: 'object' } },
          sessionReplay: { type: 'object' }
        }
      },
      AlertRule: {
        type: 'object',
        required: ['dsn', 'name', 'metric', 'condition', 'threshold'],
        properties: {
          dsn: { type: 'string' },
          name: { type: 'string' },
          metric: { type: 'string', enum: ['error_count', 'error_rate', 'lcp', 'fcp', 'cls'] },
          condition: { type: 'string', enum: ['gt', 'lt', 'eq', 'gte', 'lte'] },
          threshold: { type: 'number' },
          window: { type: 'integer', description: '时间窗口（分钟）' },
          channels: { type: 'array', items: { type: 'string' } }
        }
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
          uptime: { type: 'number' },
          memory: {
            type: 'object',
            properties: {
              used: { type: 'number' },
              total: { type: 'number' },
              percentage: { type: 'number' }
            }
          },
          services: {
            type: 'object',
            properties: {
              database: { type: 'string' },
              email: { type: 'string' }
            }
          },
          stats: {
            type: 'object',
            properties: {
              totalErrors: { type: 'integer' },
              totalPerformance: { type: 'integer' },
              totalProjects: { type: 'integer' }
            }
          }
        }
      }
    }
  }
};

// Swagger UI HTML
const swaggerHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentinel API 文档</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 30px 0; }
    .swagger-ui .info .title { font-size: 32px; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true
      });
    };
  </script>
</body>
</html>
`;

// Swagger UI 页面
router.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerHtml);
});

// OpenAPI JSON
router.get('/docs/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

export default router;
