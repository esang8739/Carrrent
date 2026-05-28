# Requirements Document

## Introduction

本系统是一个 Skill 管理服务器，通过 MCP（Model Context Protocol）协议向 AI 工具暴露技能调用能力。系统支持单组织多团队架构，采用 Node.js/TypeScript 作为 Skill 开发语言，提供请求级日志与流量监控能力。

## Glossary

- **MCP Server**: 实现 Model Context Protocol 协议的服务端，负责与 AI 工具通信并转发 Skill 调用请求
- **Skill**: 可被 AI 工具调用的功能单元，由声明式配置文件和 TypeScript 实现代码组成
- **Tenant（租户）**: 使用平台的基本组织单元，对应一个团队或项目组
- **API Key**: 租户访问 MCP Server 的认证凭证
- **Skill Registry**: Skill 元数据存储与检索服务
- **Skill Runner**: 加载并执行 Skill 代码的运行时环境
- **Audit Log**: 记录 Skill 调用请求的时间、租户、Skill 名称、耗时、状态等元数据

## Requirements

### Requirement 1: 租户管理

**User Story:** AS 平台管理员，I want 创建和管理租户，so that 不同团队可以隔离使用 Skill 资源

#### Acceptance Criteria

1. WHEN 管理员创建新租户时，系统 SHALL 生成唯一的租户 ID 和初始 API Key
2. WHEN 管理员更新租户信息时，系统 SHALL 支持修改租户名称、配额限制、启用状态
3. WHILE 租户处于禁用状态时，该租户的 API Key SHALL 无法通过认证
4. IF API Key 无效或已过期，系统 SHALL 返回 401 Unauthorized 错误
5. WHEN 管理员删除租户时，系统 SHALL 级联清理该租户关联的 Skill 和权限记录

---

### Requirement 2: Skill 管理

**User Story:** AS 租户管理员，I want 上传、发布和管理 Skill，so that 团队可以复用和共享技能

#### Acceptance Criteria

1. WHEN 用户上传 Skill 时，系统 SHALL 解析 skill.yaml 配置文件并验证输入输出 Schema
2. WHEN 用户发布 Skill 时，系统 SHALL 将 Skill 状态从 draft 变更为 published
3. WHILE Skill 处于 draft 状态时，该 Skill SHALL 不可被 MCP 调用
4. WHEN 用户更新已发布的 Skill 时，系统 SHALL 自动递增版本号并保留历史版本
5. IF Skill 依赖的 npm 包不存在，系统 SHALL 在安装阶段返回错误并阻止发布
6. WHEN 用户下架 Skill 时，系统 SHALL 将 Skill 状态变更为 archived 并保留历史调用记录

---

### Requirement 3: MCP 协议支持

**User Story:** AS AI 工具用户，I want 通过 MCP 协议调用 Skill，so that AI 可以自动发现和执行技能

#### Acceptance Criteria

1. WHEN AI 工具建立 MCP 连接时，系统 SHALL 返回该租户有权限访问的 Skill 列表
2. WHEN AI 工具调用 Skill 时，系统 SHALL 验证 API Key 并记录调用元数据到 Audit Log
3. IF Skill 执行超时（默认 30 秒），系统 SHALL 终止执行并返回 Timeout 错误
4. IF Skill 执行抛出异常，系统 SHALL 捕获异常并返回结构化错误信息
5. WHEN Skill 执行成功时，系统 SHALL 返回符合 output_schema 的响应数据

---

### Requirement 4: 日志与流量监控

**User Story:** AS 平台运维人员，I want 查看 Skill 调用日志和流量指标，so that 可以监控平台健康状态

#### Acceptance Criteria

1. WHEN Skill 调用完成时，系统 SHALL 异步写入调用日志（包含租户 ID、Skill 名、耗时、状态）
2. WHEN 用户查询日志时，系统 SHALL 支持按租户、时间范围、Skill 名称过滤
3. WHEN 用户访问 Dashboard 时，系统 SHALL 展示 QPS、P99 延迟、错误率指标
4. IF 租户调用量超过配额限制，系统 SHALL 返回 429 Too Many Requests 错误
5. WHILE 日志保留期（默认 30 天）内，用户 SHALL 可以导出 CSV 格式的日志数据

---

### Requirement 5: 权限控制

**User Story:** AS 租户管理员，I want 管理团队成员对 Skill 的访问权限，so that 敏感技能仅限授权人员使用

#### Acceptance Criteria

1. WHEN 租户管理员添加团队成员时，系统 SHALL 支持分配 Admin 或 Member 角色
2. WHILE 用户角色为 Member 时，该用户 SHALL 仅能调用 Skill，不能发布或删除
3. WHEN 用户角色为 Admin 时，该用户 SHALL 可以管理 Skill 和团队成员
4. IF 用户调用无权限的 Skill，系统 SHALL 返回 403 Forbidden 错误

---

### Requirement 6: Skill 执行沙箱

**User Story:** AS 平台管理员，I want 在安全沙箱中执行 Skill，so that 恶意代码不会危害宿主机

#### Acceptance Criteria

1. IF Skill 尝试访问受限系统 API（如文件系统、网络），系统 SHALL 拦截并抛出权限错误
2. WHILE Skill 执行时，系统 SHALL 限制最大内存使用（默认 512MB）
3. IF Skill 执行超出 CPU 配额，系统 SHALL 降级执行优先级
4. WHEN Skill 加载时，系统 SHALL 静态扫描代码并检测高风险语法

---

### Requirement 7: 配置与部署

**User Story:** AS 运维工程师，I want 通过环境变量配置系统参数，so that 可以快速部署到不同环境

#### Acceptance Criteria

1. WHEN 系统启动时，系统 SHALL 从环境变量读取数据库连接、JWT 密钥、日志级别配置
2. IF 必需的环境变量未设置，系统 SHALL 启动失败并输出错误信息
3. WHEN 使用 Docker 部署时，系统 SHALL 提供官方 Dockerfile 和 docker-compose.yml
