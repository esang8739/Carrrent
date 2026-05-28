import { VM } from 'vm2';
import { ExecuteSkillRequest, ExecuteSkillResult, Skill } from '../models/skill.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const executionLogger = logger.child('execution');

export class ExecutionService {
  async execute(request: ExecuteSkillRequest): Promise<ExecuteSkillResult> {
    const { parameters, timeout = config.sandboxTimeout, memoryLimit = config.sandboxMemoryLimit } = request;

    executionLogger.info('Executing skill', {
      skillId: request.skillId,
      timeout,
      memoryLimit,
    });

    const startTime = performance.now();
    let memoryUsed = 0;

    try {
      const vm = new VM({
        timeout,
        sandbox: {
          params: parameters,
          console,
        },
        eval: false,
        wasm: false,
      });

      const result = vm.run(request.code || '');

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

      executionLogger.error('Skill execution failed', {
        skillId: request.skillId,
        error: errorMessage,
        executionTime,
      });

      return {
        success: false,
        error: errorMessage,
        executionTime,
        memoryUsed,
      };
    }
  }

  validateCode(code: string, _skill?: Skill): ValidationResult {
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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
