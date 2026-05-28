import { MCPTool, MCPResource, MCPServer } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';

const mcpLogger = logger.child('mcp');

export class SkillMcPServer {
  private server: MCPServer;
  private tools: Set<string> = new Set();
  private resources: Set<string> = new Set();

  constructor() {
    this.server = new MCPServer();
  }

  registerTool(tool: MCPTool): void {
    this.tools.add(tool.name);
    // TODO: Implement tool registration logic
    mcpLogger.info('Tool registered', { tool: tool.name });
  }

  registerResource(resource: MCPResource): void {
    this.resources.add(resource.uri);
    // TODO: Implement resource registration logic
    mcpLogger.info('Resource registered', { uri: resource.uri });
  }

  async start(): Promise<void> {
    // TODO: Initialize MCP server
    mcpLogger.info('MCP server starting');
    // Initialize core functionality
  }

  async stop(): Promise<void> {
    // TODO: Cleanup MCP server
    mcpLogger.info('MCP server stopping');
    this.tools.clear();
    this.resources.clear();
  }

  getRegisteredTools(): string[] {
    return Array.from(this.tools);
  }

  getRegisteredResources(): string[] {
    return Array.from(this.resources);
  }
}

export const skillServer = new SkillMcPServer();
export default skillServer;
