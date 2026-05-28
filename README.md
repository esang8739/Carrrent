# Skill Management Server

基于 MCP (Model Context Protocol) 的技能管理服务器，提供安全沙箱代码执行环境和完整的技能生命周期管理。

## 特性

- **MCP 协议支持**: 与 Claude Desktop、Cursor 等 MCP 客户端深度集成
- **安全沙箱执行**: 基于 vm2 的代码隔离执行（JavaScript/TypeScript）
- **多租户架构**: 单组织多团队，完整的用户认证和权限管理（JWT）
- **双协议支持**: RESTful HTTP API + MCP RPC
- **数据持久化**: PostgreSQL + Redis
- **审计日志**: 请求级日志记录和实时指标监控
- **Docker 部署**: 一键容器化部署

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
                             │  MCP Protocol (Stdio/SSE)
┌────────────────────────────▼──────────────────────────────────────┐
│                  Skill Management Server                           │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    MCP Server Layer                         │   │
│  │  - tools/list        - tools/call                          │   │
│  │  - resources/list    - prompts/list                        │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    HTTP API Layer (Fastify)                │   │
│  │  - /api/tenants      - /api/users                          │   │
│  │  - /api/skills       - /api/logs  /api/metrics             │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    Core Services                            │   │
│  │  AuthService  │  SkillRegistry  │  ExecutionService        │   │
│  │  AuditLoggerService                                      │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────┐     ┌──────────────────┐                    │
│  │  VM2 Sandbox     │     │  Skill Storage   │                    │
│  │  - Timeout: 30s  │     │  - Local FS      │                    │
│  │  - Memory: 512MB │     │  - extensible    │                    │
│  │  - No require()  │     │    to S3/OBS     │                    │
│  └──────────────────┘     └──────────────────┘                    │
└───────────────────────────────────────────────────────────────────┘
                     │                           │
         ┌───────────▼───────┐       ┌───────────▼───────┐
         │    PostgreSQL     │       │       Redis       │
         │  - Tenants        │       │  - Quota Cache    │
         │  - Users          │       │  - Rate Limits    │
         │  - Skills         │       │  - Metrics        │
         │  - AuditLogs      │       │                   │
         └───────────────────┘       └───────────────────┘
```

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- PostgreSQL >= 15
- Redis >= 7.0
- Docker & Docker Compose (推荐)

### 使用 Docker 启动（推荐）

```bash
# 克隆仓库
git clone https://github.com/esang8739/Carrrent.git
cd Carrrent/skill-management-server

# 复制环境配置
cp .env.example .env

# 配置环境变量（必须修改）
# 编辑 .env 文件，设置 DATABASE_URL、REDIS_URL、JWT_SECRET

# 启动所有服务
docker-compose up -d

# 初始化数据库
docker-compose exec app npm run db:migrate

# 查看日志
docker-compose logs -f app
```

### 本地开发

```bash
# 安装依赖
npm install

# 复制环境配置
cp .env.example .env

# 启动 PostgreSQL 和 Redis
docker-compose up -d postgres redis

# 初始化数据库
npm run db:migrate

# 启动开发服务器
npm run dev
```

### 健康检查

```bash
curl http://localhost:3000/health
```

## MCP 客户端配置

### Claude Desktop 配置

编辑 `claude_desktop_config.json`（位置：macOS `~/Library/Application Support/Claude/`，Windows `%APPDATA%\Claude\`）：

```json
{
  "mcpServers": {
    "skill-management": {
      "command": "node",
      "args": ["/path/to/Carrrent/skill-management-server/dist/mcp/index.js"],
      "cwd": "/path/to/Carrrent/skill-management-server",
      "env": {
        "SKILL_API_KEY": "your-tenant-api-key"
      }
    }
  }
}
```

### 远程 MCP 连接（SSE 传输）

```json
{
  "mcpServers": {
    "skill-management": {
      "url": "http://your-server:3000/mcp/sse",
      "transport": "sse"
    }
  }
}
```

## API 参考

### 租户管理

#### 创建租户

```bash
POST /api/tenants
Content-Type: application/json

{
  "name": "My Team",
  "quotaLimit": 10000
}
```

响应：

```json
{
  "tenant": {
    "id": "uuid",
    "name": "My Team",
    "quotaLimit": 10000,
    "enabled": true
  },
  "apiKey": "sk_..."
}
```

#### 获取租户详情

```bash
GET /api/tenants/:id
```

#### 更新租户

```bash
PUT /api/tenants/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "quotaLimit": 20000,
  "enabled": false
}
```

#### 删除租户

```bash
DELETE /api/tenants/:id
```

#### 轮换 API Key

```bash
POST /api/tenants/:id/api-keys/rotate
```

### 用户管理

#### 创建用户

```bash
POST /api/users
Content-Type: application/json

{
  "tenantId": "uuid",
  "email": "user@example.com",
  "password": "SecureP@ssw0rd",
  "role": "developer"
}
```

角色：`admin` | `developer` | `viewer`

#### 列出用户

```bash
GET /api/users
```

#### 修改用户角色

```bash
PUT /api/users/:id/role
Content-Type: application/json

{
  "role": "admin"
}
```

### Skill 管理

#### 创建 Skill

```bash
POST /api/skills
Content-Type: application/json

{
  "tenantId": "uuid",
  "name": "data-processor",
  "description": "Process data with custom logic"
}
```

#### 列出 Skills

```bash
GET /api/skills?tenantId=uuid
```

#### 发布 Skill

```bash
PUT /api/skills/:id/publish
Content-Type: application/json

{
  "version": "1.0.0",
  "inputSchema": {
    "type": "object",
    "properties": {
      "data": { "type": "object" }
    },
    "required": ["data"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "result": { "type": "object" }
    }
  },
  "code": "export function execute(params) { return params.data; }"
}
```

#### 下架 Skill

```bash
PUT /api/skills/:id/archive
```

### 审计日志

#### 查询日志

```bash
GET /api/logs?tenantId=uuid&skillId=uuid&status=success&limit=100&offset=0
```

查询参数：
- `tenantId` (必需) - 租户 ID
- `skillId` (可选) - Skill ID
- `status` (可选) - success | error | timeout
- `startDate` (可选) - ISO 8601 格式
- `endDate` (可选) - ISO 8601 格式
- `limit` (可选) - 默认 100
- `offset` (可选) - 默认 0

#### 获取指标

```bash
GET /api/metrics?tenantId=uuid&windowMs=3600000
```

返回过去 1 小时的指标：

```json
{
  "metrics": {
    "qps": 12.5,
    "p99Latency": 245,
    "p95Latency": 180,
    "errorRate": 0.02,
    "totalRequests": 45000
  }
}
```

## MCP 工具列表

启动 MCP 服务器后，AI 客户端可用的工具：

| 工具名称 | 描述 | 参数 |
|---------|------|------|
| `list_skills` | 列出当前租户发布的所有技能 | - |
| `execute_skill` | 执行指定技能 | `name` (string), `parameters` (object) |

示例用法（在 Claude Desktop 中）：

```
Use the list_skills tool to see available skills

Then execute: execute_skill with name="data-processor" and parameters={"data": {"key": "value"}}
```

## Skill 开发指南

### 基础模板

```typescript
// Skill 代码必须导出一 execute 函数
export function execute(params: Record<string, unknown>): unknown {
  // 业务逻辑
  const { data, options } = params;
  
  const result = processData(data);
  
  return {
    success: true,
    result
  };
}

function processData(data: unknown): unknown {
  // 数据处理逻辑
  return data;
}
```

### 安全限制

Skill 代码在 vm2 沙箱中执行，以下操作被禁止：

- ❌ 使用 `require()` 或 `import` 引入外部模块
- ❌ 使用 `eval()`、`Function()` 动态执行代码
- ❌ 网络请求（`fetch`、`http`、`net` 模块）
- ❌ 文件系统访问（`fs` 模块）
- ❌ 子进程执行（`child_process` 模块）
- ❌ WebAssembly 执行
- ❌ 代码大小超过 1MB

### 执行限制

| 限制项 | 默认值 | 可配置 |
|-------|--------|--------|
| 执行超时 | 30 秒 | ✅ |
| 内存限制 | 512MB | ✅ |
| 代码大小 | 1MB | ❌ |

### 错误处理

```typescript
export function execute(params: Record<string, unknown>): unknown {
  try {
    const result = processData(params.data);
    return { success: true, result };
  } catch (error) {
    console.error('Execution failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### 测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { execute } from './my-skill';

describe('My Skill', () => {
  it('should process data correctly', () => {
    const result = execute({ data: { key: 'value' } });
    expect(result).toEqual({ success: true, result: { key: 'value' } });
  });

  it('should handle errors gracefully', () => {
    const result = execute({ data: null });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

## 部署指南

### Docker Compose 部署

```bash
# 构建并启动
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 停止所有服务
docker-compose down
```

### 环境变量配置

| 变量名 | 默认值 | 说明 | 必需 |
|-------|--------|------|------|
| `NODE_ENV` | development | 运行环境 | ❌ |
| `SERVER_HOST` | 0.0.0.0 | 服务器监听地址 | ❌ |
| `SERVER_PORT` | 3000 | 服务器端口 | ❌ |
| `SERVER_LOG_LEVEL` | info | 日志级别 | ❌ |
| `DATABASE_URL` | - | PostgreSQL 连接字符串 | ✅ |
| `DATABASE_SSL` | false | 数据库 SSL | ❌ |
| `DATABASE_POOL_MIN` | 2 | 连接池最小连接数 | ❌ |
| `DATABASE_POOL_MAX` | 10 | 连接池最大连接数 | ❌ |
| `REDIS_URL` | - | Redis 连接字符串 | ✅ |
| `REDIS_PREFIX` | skills: | Redis key 前缀 | ❌ |
| `JWT_SECRET` | - | JWT 密钥（生产环境必须修改） | ✅ |
| `JWT_EXPIRES_IN` | 24h | Access Token 有效期 | ❌ |
| `JWT_REFRESH_EXPIRES_IN` | 7d | Refresh Token 有效期 | ❌ |
| `BCRYPT_SALT_ROUNDS` | 10 | 密码哈希轮数 | ❌ |
| `SANDBOX_MEMORY_LIMIT` | 512 | 沙箱内存限制 (MB) | ❌ |
| `SANDBOX_TIMEOUT` | 30000 | 沙箱执行超时 (ms) | ❌ |
| `SKILL_STORAGE_PATH` | ./skills | Skill 代码存储路径 | ❌ |

### 生产环境建议

1. **安全性**
   - 设置强 JWT_SECRET（至少 32 字符）
   - 启用数据库 SSL 连接
   - 使用防火墙限制访问
   - 定期轮换 API Key

2. **性能优化**
   - 调整连接池大小（根据并发量）
   - 使用 Redis 缓存热点 Skill
   - 配置日志轮转（避免磁盘爆满）

3. **监控告警**
   - 监控 CPU/内存使用率
   - 设置错误率告警（>5% 触发）
   - 监控 P99 延迟
   - 配置日志聚合（ELK/Loki）

4. **高可用**
   - 使用 Docker Swarm 或 Kubernetes
   - 配置多副本负载均衡
   - 数据库主从复制
   - Redis Sentinel 或 Cluster

## 开发规范

### Git 提交规范

```
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式化（不影响代码逻辑）
refactor: 重构代码（非新功能非 bug 修复）
perf: 性能优化
test: 测试用例
chore: 构建/工具链/配置相关
```

### 代码检查

```bash
# TypeScript 类型检查
npm run typecheck

# ESLint 检查
npm run lint
npm run lint:fix

# Prettier 格式化
npm run format
```

### 测试

```bash
# 运行单元测试
npm run test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 错误码说明

### MCP 错误码

| 错误码 | 含义 | 处理建议 |
|-------|------|----------|
| -32001 | Invalid API Key | 检查 API Key 是否正确 |
| -32002 | Skill Not Found | 确认 Skill ID 和发布状态 |
| -32003 | Permission Denied | 检查租户权限 |
| -32004 | Quota Exceeded | 提升配额或等待下月 |
| -32005 | Execution Timeout | 优化代码或增加超时配置 |
| -32006 | Execution Error | 查看错误详情并修复代码 |
| -32007 | Invalid Input | 检查输入参数是否符合 Schema |

## 故障排查

### 常见问题

**1. MCP Server 无法启动**

```bash
# 检查 Node.js 版本
node --version  # 必须 >= 20

# 检查依赖安装
npm install

# 查看启动日志
npm run dev
```

**2. 数据库连接失败**

```bash
# 测试数据库连接
docker-compose exec postgres psql -U postgres -d skill_management -c "SELECT 1"

# 检查连接字符串格式
# 正确格式：postgresql://user:password@host:port/database
```

**3. Skill 执行超时**

- 检查代码是否存在死循环
- 增加 `SANDBOX_TIMEOUT` 配置
- 优化算法复杂度

**4. Redis 连接失败**

```bash
# 测试 Redis 连接
docker-compose exec redis redis-cli ping
# 应返回：PONG
```

### 日志查看

```bash
# 实时日志
docker-compose logs -f app

# 最近 100 行
docker-compose logs --tail=100 app

# 错误日志
docker-compose logs app | grep ERROR
```

## License

MIT

## Contributing

欢迎提交 Issue 和 Pull Request！

## 联系方式

- GitHub: https://github.com/esang8739/Carrrent
- Issues: https://github.com/esang8739/Carrrent/issues
