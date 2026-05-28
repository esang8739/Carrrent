import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ExecutionService } from '../services/execution-service.js';
import { SkillRegistry } from '../services/skill-registry.js';
import { AuditLoggerService } from '../services/audit-logger-service.js';
import { logger } from '../utils/logger.js';

const mcpLogger = logger.child('mcp-server');

const MCP_ERRORS = {
  INVALID_API_KEY: -32001,
  SKILL_NOT_FOUND: -32002,
  PERMISSION_DENIED: -32003,
  QUOTA_EXCEEDED: -32004,
  EXECUTION_TIMEOUT: -32005,
  EXECUTION_ERROR: -32006,
  INVALID_INPUT: -32007,
} as const;

export interface McpServerConfig {
  apiKey: string;
  tenantId: string;
}

export class SkillMcpServer {
  private server: Server;
  private tenantId: string;
  private executionService: ExecutionService;
  private skillRegistry: SkillRegistry;
  private auditLogger: AuditLoggerService;

  constructor(
    config: McpServerConfig,
    executionService: ExecutionService,
    skillRegistry: SkillRegistry,
    auditLogger: AuditLoggerService
  ) {
    this.tenantId = config.tenantId;
    this.executionService = executionService;
    this.skillRegistry = skillRegistry;
    this.auditLogger = auditLogger;

    this.server = new Server(
      {
        name: 'skill-management-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      mcpLogger.debug('Listing tools');
      const skills = await this.skillRegistry.listPublishedSkills(this.tenantId);

      return {
        tools: skills.map((skill) => ({
          name: skill.name,
          description: skill.description || `Execute skill: ${skill.name}`,
          inputSchema: {
            type: 'object',
            properties: {
              parameters: {
                type: 'object',
                description: 'Parameters to pass to the skill',
              },
            },
            required: ['parameters'],
          },
        })),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      mcpLogger.info('Calling tool', { tool: name, args });

      const startTime = performance.now();

      try {
        const skills = await this.skillRegistry.listPublishedSkills(this.tenantId);
        const skill = skills.find((s) => s.name === name);

        if (!skill) {
          throw {
            code: MCP_ERRORS.SKILL_NOT_FOUND,
            message: `Skill '${name}' not found or not published`,
          };
        }

        const parameters = (args?.['parameters'] as Record<string, unknown>) || {};
        const result = await this.executionService.execute({
          skillId: skill.id,
          tenantId: this.tenantId,
          parameters,
        });

        const duration = performance.now() - startTime;

        await this.auditLogger.log({
          tenantId: this.tenantId,
          skillId: skill.id,
          status: result.success ? 'success' : 'error',
          durationMs: Math.round(duration),
          errorMessage: result.error || undefined,
          input: parameters as Record<string, unknown>,
          output: result.output ? (result.output as Record<string, unknown>) : undefined,
        });

        if (!result.success) {
          throw {
            code: result.error?.includes('timeout')
              ? MCP_ERRORS.EXECUTION_TIMEOUT
              : MCP_ERRORS.EXECUTION_ERROR,
            message: result.error || 'Skill execution failed',
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.output, null, 2),
            },
          ],
        };
      } catch (error: any) {
        const duration = performance.now() - startTime;

        if (error.code) {
          await this.auditLogger.log({
            tenantId: this.tenantId,
            skillId: name,
            status: 'error',
            durationMs: Math.round(duration),
            errorMessage: error.message,
          });

          throw error;
        }

        mcpLogger.error('Tool call failed', { error, tool: name });
        throw {
          code: MCP_ERRORS.EXECUTION_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      mcpLogger.debug('Listing resources');
      return {
        resources: [
          {
            uri: 'skills://published',
            name: 'Published Skills',
            description: 'List of all published skills for the current tenant',
            mimeType: 'application/json',
          },
        ],
      };
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      mcpLogger.debug('Listing prompts');
      return {
        prompts: [],
      };
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    mcpLogger.info('MCP server started with stdio transport');
  }

  async stop(): Promise<void> {
    mcpLogger.info('MCP server stopping');
    await this.server.close();
    await this.auditLogger.destroy();
  }
}

export function createMcpServer(
  config: McpServerConfig,
  executionService: ExecutionService,
  skillRegistry: SkillRegistry,
  auditLogger: AuditLoggerService
): SkillMcpServer {
  return new SkillMcpServer(config, executionService, skillRegistry, auditLogger);
}
