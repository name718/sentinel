# Server 部署到 Vercel 指南

## 前置准备

1. **Vercel 账号** - https://vercel.com
2. **PostgreSQL 数据库** - 推荐使用 [Neon](https://neon.tech)（免费）
3. **GitHub 仓库** - 代码需要推送到 GitHub

## 部署步骤

### 第一步：准备数据库

1. 访问 https://neon.tech 注册账号
2. 创建新项目，选择离你最近的区域
3. 复制连接字符串，格式如：
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

### 第二步：部署到 Vercel

#### 方式一：通过 Vercel 网站（推荐）

1. 访问 https://vercel.com/new
2. 点击 "Import Git Repository"
3. 选择你的 GitHub 仓库
4. 配置项目：
   - **Framework Preset**: Other
   - **Root Directory**: `packages/server`（点击 Edit 修改）
   - **Build Command**: 留空
   - **Output Directory**: 留空

5. 展开 "Environment Variables"，添加以下变量：

| 变量名 | 值 | 必填 |
|--------|-----|------|
| `DATABASE_URL` | 你的 PostgreSQL 连接字符串 | ✅ |
| `JWT_SECRET` | 随机字符串（至少32位） | ✅ |
| `SMTP_HOST` | 邮件服务器地址 | ❌ |
| `SMTP_PORT` | 邮件端口（465 或 587） | ❌ |
| `SMTP_USER` | 邮件账号 | ❌ |
| `SMTP_PASS` | 邮件密码/授权码 | ❌ |
| `SMTP_FROM` | 发件人邮箱 | ❌ |

6. 点击 "Deploy"

#### 方式二：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 进入 server 目录
cd packages/server

# 登录 Vercel
vercel login

# 部署（首次会有交互式配置）
vercel

# 设置环境变量
vercel env add DATABASE_URL
vercel env add JWT_SECRET

# 生产部署
vercel --prod
```

### 第三步：验证部署

部署成功后，访问：
```
https://your-project.vercel.app/api/health
```

应该返回：
```json
{"status":"ok","timestamp":1234567890}
```

## 环境变量说明

### DATABASE_URL（必填）
PostgreSQL 数据库连接字符串。

**Neon 示例：**
```
postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### JWT_SECRET（必填）
用于签名 JWT token 的密钥，建议使用随机字符串。

**生成方式：**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### SMTP 配置（可选，用于邮件告警）

**QQ 邮箱示例：**
```
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your-email@qq.com
SMTP_PASS=你的授权码（不是QQ密码）
SMTP_FROM=your-email@qq.com
```

**Gmail 示例：**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=应用专用密码
SMTP_FROM=your-email@gmail.com
```

## 常见问题

### Q: 部署失败，提示找不到模块？
A: 确保 Root Directory 设置为 `packages/server`

### Q: 数据库连接失败？
A: 检查 DATABASE_URL 是否正确，确保包含 `?sslmode=require`

### Q: API 返回 500 错误？
A: 查看 Vercel 的 Function Logs 获取详细错误信息

### Q: 如何查看日志？
A: Vercel Dashboard → 你的项目 → Deployments → 选择部署 → Functions → 查看日志

## 部署后的 API 地址

部署成功后，你的 API 地址格式为：
```
https://your-project-name.vercel.app/api
```

将此地址配置到 Dashboard 和 Website 的 `VITE_API_URL` 环境变量中。
