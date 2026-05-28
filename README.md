# Skill Management Server

基于 MCP (Model Context Protocol) 的技能管理服务器，提供安全可靠的代码执行环境和完整的技能生命周期管理。

## 特性

- 基于 MCP 协议与 AI 客户端（如 Claude、Cursor）深度集成
- 支持安全沙箱代码执行（JavaScript/TypeScript）
- 完整的用户认证和权限管理（JWT）
- PostgreSQL + Redis 数据存储
- RESTful API 和 MCP RPC 双协议支持
- 实时日志和指标监控
- Docker 容器化部署

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         MCP Clients                              │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │
│    │   Claude    │  │    Cursor   │  │   Other MCP Apps    │    │
│    └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘    │
│           │                │                      │               │
│           └────────────────┼──────────────────────┘               │
│                            │                                       │
└────────────────────────────┼──────────────────────────────────────┘
                             │  MCP Protocol
┌────────────────────────────▼──────────────────────────────────────┐
│                      MCP Server (Port 3000)                       │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │  Authentication │  │  Skill Management│  │   Execution     │   │
│  │    Service      │  │     Service      │  │    Service      │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                   │
│         ┌──────────────────┐     ┌──────────────────────┐         │
│         │  VM2 Sandbox     │     │  Fastify HTTP API    │         │
│         │  (VM Isolation)  │     │  (RESTful Interface) │         │
│         └──────────────────┘     └──────────────────────┘         │
└───────────────────────────────────────────────────────────────────┘
                    │                           │
        ┌───────────▼───────┐       ┌───────────▼───────┐           │
        │    PostgreSQL     │       │       Redis       │           │
        │  ┌───────────────┐│       │  ┌───────────────┐│           │
        │  │ Users         ││       │  │ Sessions      ││           │
        │  │ Skills        ││       │  │ Cache         ││           │
        │  │ Logs          ││       │  │ Rate Limits   ││           │
        │  └───────────────┘│       │  └───────────────┘│           │
        └───────────────────┘       └───────────────────┘           │
```

## 快速开始

### 1. 环境要求

- Node.js >= 20.0.0
- PostgreSQL >= 14
- Redis >= 7.0
- Docker & Docker Compose (推荐)

### 2. 使用 Docker 启动（推荐）

```bash
# Clone the repository
git clone https://github.com/your-org/skill-management-server.git
cd skill-management-server

# Copy environment configuration
cp .env.example .env

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f app
```

### 3. 本地开发

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Create database tables
# TODO: Add migration scripts

# Start development server
npm run dev
```

### 4. 健康检查

```bash
curl http://localhost:3000/health
```

## MCP 客户端配置

### Claude Desktop 配置

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "skill-management": {
      "command": "node",
      "args": ["/path/to/skill-management-server/dist/mcp/server.js"],
      "cwd": "/path/to/skill-management-server"
    }
  }
}
```

### 远程 MCP 连接

```json
{
  "mcpServers": {
    "skill-management": {
      "url": "http://your-server:3000/mcp",
      "token": "your-api-token",
      "transport": "http"
    }
  }
}
```

## API 参考

### 认证接口

#### 登录

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

响应：

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400
}
```

#### 刷新 Token

```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Skill 接口

#### 创建 Skill

```bash
POST /api/v1/skills
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "data-processor",
  "description": "Process data with custom logic",
  "version": "1.0.0",
  "author": "username",
  "codeType": "typescript",
  "code": "export function process(data) { return data; }"
}
```

#### 获取 Skill

```bash
GET /api/v1/skills/{id}
Authorization: Bearer <access_token>
```

#### 执行 Skill

```bash
POST /api/v1/skills/{id}/execute
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "parameters": {
    "key": "value"
  },
  "timeout": 5000,
  "memoryLimit": 128
}
```

响应：

```json
{
  "success": true,
  "output": { "processed": true },
  "executionTime": 45,
  "memoryUsed": 32
}
```

#### 列出所有 Skills

```bash
GET /api/v1/skills
Authorization: Bearer <access_token>
```

查询参数：
- `status` - 过滤状态 (draft/active/archived/disabled)
- `codeType` - 过滤代码类型 (javascript/typescript/python)
- `limit` - 分页大小 (默认 20)
- `offset` - 分页偏移 (默认 0)
- `sortBy` - 排序字段
- `sortOrder` - 排序方向 (asc/desc)

#### 更新 Skill

```bash
PUT /api/v1/skills/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "updated-name",
  "description": "updated description",
  "status": "active"
}
```

#### 删除 Skill

```bash
DELETE /api/v1/skills/{id}
Authorization: Bearer <access_token>
```

### 用户接口

#### 获取当前用户信息

```bash
GET /api/v1/users/me
Authorization: Bearer <access_token>
```

#### 列出所有用户

```bash
GET /api/v1/users
Authorization: Bearer <access_token>
Query: ?role=admin&limit=10&offset=0
```

## MCP 工具列表

| 工具名称 | 描述 | 参数 |
|---------|------|------|
| `list_skills` | 列出所有可用技能 | - |
| `get_skill` | 获取技能详情 | skill_id (string) |
| `create_skill` | 创建新技能 | name, description, code, codeType |
| `update_skill` | 更新技能 | skill_id, name?, description?, code? |
| `delete_skill` | 删除技能 | skill_id |
| `execute_skill` | 执行技能代码 | skill_id, parameters |
| `create_user` | 创建用户 | username, email, password |
| `get_user` | 获取用户信息 | user_id |
| `list_users` | 列出所有用户 | - |
| `validate_code` | 验证代码安全性 | code, codeType |

## MCP Resources

| URI 类型 | 描述 |
|---------|------|
| `skills://metadata` | 技能元数据列表 |
| `skills://{id}/details` | 特定技能详情 |
| `skills://{id}/logs` | 技能执行日志 |

## Skill 开发指南

### 1. 基础模板

```typescript
// 标准 Skill 模板
export interface Input {
  // 定义输入参数
  data: any;
  options?: {
    timeout?: number;
    retry?: number;
  };
}

export function process(input: Input): Output {
  const { data, options } = input;
  
  // 业务逻辑
  const result = processData(data, options);
  
  return {
    success: true,
    data: result
  };
}

// 辅助函数
function processData(data: any, options: any): any {
  // 实现数据处理逻辑
  return data;
}
```

### 2. 安全注意事项

- 不要使用 `require()` 或 `import` 引入外部模块
- 禁止使用 `eval()`、`Function` 等动态执行
- 禁止网络请求（http、fetch 等）
- 代码大小限制 1MB
- 执行超时 5 秒（可配置）
- 内存限制 128MB（可配置）

### 3. 错误处理

```typescript
export function process(input: Input): Output {
  try {
    // 业务逻辑
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Processing failed:', error.message);
    return {
      success: false,
      error: error.message,
      code: 'PROCESSING_ERROR'
    };
  }
}
```

### 4. 测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { process } from './skill';

describe('Skill Tests', () => {
  it('should process data correctly', () => {
    const result = process({ data: { key: 'value' } });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ key: 'value' });
  });

  it('should handle errors gracefully', () => {
    const result = process({ data: null });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

## 部署指南

### Docker 部署

```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down --volumes
```

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: skill-mgmt
spec:
  replicas: 3
  selector:
    matchLabels:
      app: skill-mgmt
  template:
    metadata:
      labels:
        app: skill-mgmt
    spec:
      containers:
      - name: app
        image: your-registry/skill-management-server:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: skill-mgmt-secrets
        - configMapRef:
            name: skill-mgmt-config
---
apiVersion: v1
kind: Service
metadata:
  name: skill-mgmt-service
spec:
  selector:
    app: skill-mgmt
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

### 环境变量配置

| 变量名 | 默认值 | 说明 |
|-------|--------|------|
| SERVER_HOST | 0.0.0.0 | 服务器监听地址 |
| SERVER_PORT | 3000 | 服务器端口 |
| DATABASE_URL | - | PostgreSQL 连接字符串 |
| REDIS_URL | redis://localhost:6379 | Redis 连接字符串 |
| JWT_SECRET | - | JWT 密钥（生产环境必须修改） |
| JWT_EXPIRES_IN | 24h | Token 有效期 |
| BCRYPT_SALT_ROUNDS | 10 | 密码哈希轮数 |
| SANDBOX_TIMEOUT | 5000 | 代码执行超时（ms） |
| SANDBOX_MEMORY_LIMIT | 128 | 代码执行内存限制（MB） |

### 数据库初始化

```sql
-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'developer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- 技能表
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  version VARCHAR(20) NOT NULL,
  author VARCHAR(50) NOT NULL,
  code_type VARCHAR(20) NOT NULL,
  code TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_skills_status ON skills(status);
CREATE INDEX idx_skills_author ON skills(author);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### 监控和日志

```bash
# 查看实时日志
docker-compose logs -f app

# 查看 PostgreSQL 日志
docker-compose logs -f postgres

# 查看 Redis 日志
docker-compose logs -f redis

# 进入容器调试
docker-compose exec app sh

# 数据库连接
docker-compose exec postgres psql -U postgres -d skill_management
```

## 开发规范

### 代码提交

```bash
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式化
refactor: 重构代码
perf: 性能优化
test: 测试用例
chore: 构建/工具链相关
```

### Lint && Format

```bash
# TypeScript 类型检查
npm run typecheck

# ESLint 检查
npm run lint
npm run lint:fix

# Prettier 格式化
npm run format
npm run format:check
```

### 测试

```bash
# 单元测试
npm run test

# 监听模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

## License

MIT

## Contributing

欢迎提交 Issue 和 Pull Request！

## 联系方式

- GitHub Issues: https://github.com/your-org/skill-management-server/issues
- Email: support@example.com
