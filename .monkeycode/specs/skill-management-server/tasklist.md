# 实施计划

## Phase 1: 项目初始化

- [ ] 1. 初始化项目结构和基础配置
  - [ ] 1.1 创建 package.json 并配置项目元数据
    - 项目名称：skill-management-server
    - 使用 TypeScript 5.x
    - 配置 ES Module
  - [ ] 1.2 创建 TypeScript 配置文件 tsconfig.json
    - 配置 strict 模式
    - 配置 ESM 输出
  - [ ] 1.3 创建基础目录结构
    - src/mcp - MCP 协议实现
    - src/services - 核心服务
    - src/models - 数据模型
    - src/db - 数据库访问
    - src/api - HTTP API
    - src/utils - 工具函数

- [ ] 2. 配置开发工具链
  - [ ] 2.1 安装开发与运行时依赖
    - 运行时：@modelcontextprotocol/sdk, postgres, redis, json-schema, vm2
    - 开发：typescript, @types/node, vitest, eslint, prettier
  - [ ] 2.2 配置 ESLint 和 Prettier
  - [ ] 2.3 配置 Vitest 测试框架

- [ ] 3. 检查点 - 确保项目可以正常构建
  - 运行 `npm run build` 验证 TypeScript 编译
  - 确保所有测试通过，如有疑问请询问用户

## Phase 2: 数据模型与数据库

- [ ] 4. 实现数据模型和类型定义
  - [ ] 4.1 创建租户模型 Tenant
    - 定义 id, name, api_key, quota_limit, enabled 字段
    - 实现 API Key 生成和验证方法
  - [ ] 4.2 创建用户模型 User
    - 定义 id, tenant_id, email, password_hash, role 字段
    - 实现密码哈希和验证方法
  - [ ] 4.3 创建 Skill 模型
    - Skill 主表：id, tenant_id, name, description, status
    - SkillVersion: id, skill_id, version, input_schema, output_schema, code_path
  - [ ] 4.4 创建审计日志模型 AuditLog
    - 定义 tenant_id, skill_id, status, duration_ms, created_at 字段

- [ ] 5. 实现数据库访问层
  - [ ] 5.1 创建数据库连接工具
    - 实现 PostgreSQL 连接池
    - 配置 SSL 和连接参数
  - [ ] 5.2 实现 Repository 模式基础接口
    - 定义 BaseRepository 泛型接口
    - 实现 CRUD 基础方法
  - [ ] 5.3 实现 TenantRepository
    - 实现 findByApiKey 方法
    - 实现 quota 检查和扣减方法
  - [ ] 5.4 实现 SkillRepository
    - 实现按状态查询方法
    - 实现版本管理方法
  - [ ] 5.5 实现 AuditLogRepository
    - 实现异步写入方法
    - 实现带过滤的查询方法

- [ ] 6. 检查点 - 确保数据库层测试通过
  - 运行数据库相关单元测试
  - 确保所有测试通过，如有疑问请询问用户

## Phase 3: 核心服务实现

- [ ] 7. 实现认证服务 (AuthService)
  - [ ] 7.1 实现 API Key 验证逻辑
    - 从请求头提取 API Key
    - 调用 TenantRepository 验证并返回租户信息
  - [ ] 7.2 实现配额管理
    - 使用 Redis 实现 Token Bucket 算法
    - 实现 quota 检查和扣减逻辑
  - [ ] 7.3 实现 JWT Token 签发（管理端使用）
    - 为管理后台用户生成登录 Token

- [ ] 8. 实现 Skill 注册服务 (SkillRegistry)
  - [ ] 8.1 实现 Skill 元数据管理
    - 实现 listPublishedSkills 方法
    - 实现 getSkill 方法（支持版本指定）
  - [ ] 8.2 实现版本管理
    - 实现语义化版本递增逻辑
    - 实现状态机（draft → published → archived）
  - [ ] 8.3 实现 Skill 上传解析
    - 解析 skill.yaml 配置文件
    - 验证 input_schema 和 output_schema

- [ ] 9. 实现 Skill 执行服务 (SkillRunner)
  - [ ] 9.1 实现沙箱加载器
    - 使用 vm2 创建安全上下文
    - 禁用 fs、net 等危险 API
  - [ ] 9.2 实现执行引擎
    - 动态导入 TypeScript 模块
    - 调用 skill 模块的 execute 函数
  - [ ] 9.3 实现超时和内存限制
    - 配置执行超时（默认 30 秒）
    - 配置最大内存（默认 512MB）

- [ ] 10. 实现审计日志服务 (AuditLogger)
  - [ ] 10.1 实现异步日志写入
    - 使用内存队列缓冲日志
    - 批量写入 PostgreSQL
  - [ ] 10.2 实现指标聚合
    - 使用 Redis 实时计算 QPS
    - 计算 P99 延迟和错误率
  - [ ] 10.3 实现日志查询接口
    - 支持按租户、时间范围、Skill 过滤
    - 支持 CSV 格式导出

- [ ] 11. 检查点 - 确保核心服务测试通过
  - 运行服务层单元测试
  - 确保所有测试通过，如有疑问请询问用户

## Phase 4: MCP 协议实现

- [ ] 12. 实现 MCP Server
  - [ ] 12.1 实现协议层
    - 遵循 JSON-RPC 2.0 规范
    - 实现 Stdio 传输
    - 实现 SSE 传输
  - [ ] 12.2 实现 MCP 方法
    - initialize - MCP 握手
    - tools/list - 返回可用的 Skill 列表
    - tools/call - 调用指定 Skill
  - [ ] 12.3 实现错误处理
    - 定义 MCP 错误码（-32001 ~ -32007）
    - 返回结构化错误响应

- [ ] 13. 检查点 - 确保 MCP 协议测试通过
  - 运行 MCP 协议集成测试
  - 确保所有测试通过，如有疑问请询问用户

## Phase 5: HTTP API（管理端）

- [ ] 14. 实现管理端 API
  - [ ] 14.1 配置 HTTP 服务器（Fastify）
    - 配置 JSON Schema 验证
    - 配置错误处理中间件
  - [ ] 14.2 实现租户管理接口
    - POST /api/tenants - 创建租户
    - GET /api/tenants/:id - 获取租户详情
    - PUT /api/tenants/:id - 更新租户
    - DELETE /api/tenants/:id - 删除租户
    - POST /api/tenants/:id/api-keys/rotate - 轮换 API Key
  - [ ] 14.3 实现用户管理接口
    - POST /api/users - 创建用户
    - GET /api/users - 列出用户（支持分页）
    - PUT /api/users/:id/role - 修改用户角色
  - [ ] 14.4 实现 Skill 管理接口
    - POST /api/skills - 上传 Skill
    - PUT /api/skills/:id/publish - 发布 Skill
    - PUT /api/skills/:id/archive - 下架 Skill
    - GET /api/skills - 列出 Skill
  - [ ] 14.5 实现日志查询接口
    - GET /api/logs - 查询审计日志
    - GET /api/metrics - 获取流量指标

- [ ] 15. 实现用户认证中间件
  - [ ] 15.1 实现 JWT 验证中间件
    - 验证管理端用户 Token
    - 解析用户上下文
  - [ ] 15.2 实现权限控制中间件
    - 检查用户角色权限
    - 拦截未授权访问

- [ ] 16. 检查点 - 确保 API 测试通过
  - 运行 API 集成测试
  - 确保所有测试通过，如有疑问请询问用户

## Phase 6: 项目文档

- [ ] 17. 编写 README.md 文档
  - [ ] 17.1 项目介绍和特性列表
  - [ ] 17.2 架构图和说明
  - [ ] 17.3 快速开始指南
    - 环境要求
    - 安装步骤
    - 配置说明
  - [ ] 17.4 MCP 客户端配置示例
    - Claude Desktop 配置
    - 其他 MCP 工具配置
  - [ ] 17.5 API 参考文档
    - 认证方式
    - 接口列表
    - 错误码说明
  - [ ] 17.6 Skill 开发指南
    - skill.yaml 格式说明
    - 代码示例
    - 最佳实践
  - [ ] 17.7 部署指南
    - Docker 部署
    - 环境变量配置
    - 生产环境建议

- [ ] 18. 检查点 - 确保文档完整
  - 审查 README.md 是否覆盖所有使用场景
  - 确保所有测试通过，如有疑问请询问用户
