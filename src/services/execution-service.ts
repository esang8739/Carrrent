import { VM } from 'vm2';
import { SkillVersion } from '../models/skill.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { SkillRegistry } from './skill-registry.js';

const executionLogger = logger.child('execution');

export interface ExecutionRequest {
  skillId: string;
  tenantId: string;
  version?: string;
  parameters: Record<string, unknown>;
  code?: string;
  timeout?: number;
  memoryLimit?: number;
}

export interface ExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  executionTime: number;
  memoryUsed: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ExecutionService {
  constructor(private registry: SkillRegistry) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const timeout = request.timeout || config.sandboxTimeout;
    const memoryLimit = request.memoryLimit || config.sandboxMemoryLimit;

    executionLogger.info('Executing skill', {
      skillId: request.skillId,
      tenantId: request.tenantId,
      version: request.version || 'latest',
      timeout,
      memoryLimit,
    });

    const startTime = performance.now();
    let memoryUsed = 0;

    try {
      let skillVersion: SkillVersion;
      let code: string;

      if (request.code) {
        code = request.code;
      } else {
        skillVersion = await this.registry.getSkill(request.skillId, request.version);
        code = await this.registry.getSkillCode(skillVersion);
      }

      const validation = this.validateCode(code);
      if (!validation.valid) {
        throw new Error(`Code validation failed: ${validation.errors.join(', ')}`);
      }

      const vm = new VM({
        timeout,
        sandbox: {
          params: request.parameters,
          console,
        },
        eval: false,
        wasm: false,
      });

      const result = vm.run(code);

      memoryUsed = this.getMemoryUsage();
      const executionTime = performance.now() - startTime;

      executionLogger.info('Skill execution completed', {
        skillId: request.skillId,
        executionTime,
        memoryUsed,
      });

      return {
        success: true,
        output: result,
        executionTime,
        memoryUsed,
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage.includes('timeout');

      executionLogger.error('Skill execution failed', {
        skillId: request.skillId,
        error: errorMessage,
        executionTime,
        isTimeout,
      });

      return {
        success: false,
        error: errorMessage,
        executionTime,
        memoryUsed,
      };
    }
  }

  validateCode(code: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!code || code.trim().length === 0) {
      errors.push('Code cannot be empty');
    }

    if (code.length > 1024 * 1024) {
      errors.push('Code exceeds maximum size (1MB)');
    }

    const forbiddenPatterns = [
      /require\s*\(/i,
      /import\s+.*\s+from\s+/i,
      /eval\s*\(/i,
      /new\s+Function\s*\(/i,
      /fetch\s*\(/i,
      /XMLHttpRequest/i,
      /http\s*\./i,
      /net\s*\./i,
      /fs\s*\./i,
      /child_process/i,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        warnings.push(`Potentially unsafe pattern detected: ${pattern.source}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    }
    return 0;
  }
}
