import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionService } from '../src/services/execution-service';
import { SkillRegistry } from '../src/services/skill-registry';

class MockSkillRegistry {
  private skills: Map<string, any> = new Map();

  async getSkill(skillId: string, version?: string) {
    return this.skills.get(skillId);
  }

  async getSkillCode(skillVersion: any) {
    return skillVersion.code;
  }
}

describe('ExecutionService', () => {
  let skillRegistry: MockSkillRegistry;
  let executionService: ExecutionService;

  beforeEach(() => {
    skillRegistry = new MockSkillRegistry();
    executionService = new ExecutionService(skillRegistry as any);
  });

  describe('execute', () => {
    it('should execute simple code successfully', async () => {
      const code = `
        (function() {
          return { result: params.value * 2 };
        })();
      `;

      const result = await executionService.execute({
        skillId: 'test-skill',
        tenantId: 'test-tenant',
        parameters: { value: 21 },
        code,
        timeout: 5000,
        memoryLimit: 128,
      });

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ result: 42 });
      expect(result.executionTime).toBeLessThan(5000);
    });

    it('should handle execution timeout', async () => {
      const code = `
        (function() {
          while(true) {} // Infinite loop
          return { result: 'never reached' };
        })();
      `;

      const result = await executionService.execute({
        skillId: 'test-skill',
        tenantId: 'test-tenant',
        parameters: {},
        code,
        timeout: 100,
        memoryLimit: 128,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // vm2 throws "Unknown error" for timeouts in some versions
      expect(result.executionTime).toBeGreaterThanOrEqual(100);
    });

    it('should handle runtime errors', async () => {
      const code = `
        (function() {
          throw new Error('Test error');
        })();
      `;

      const result = await executionService.execute({
        skillId: 'test-skill',
        tenantId: 'test-tenant',
        parameters: {},
        code,
        timeout: 5000,
        memoryLimit: 128,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error');
    });
  });

  describe('validateCode', () => {
    it('should accept valid code', () => {
      const code = `
        export function execute(params) {
          return { result: params.value };
        }
      `;

      const validation = executionService.validateCode(code);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty code', () => {
      const validation = executionService.validateCode('');
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Code cannot be empty');
    });

    it('should warn about require() usage', () => {
      const code = `
        const fs = require('fs');
        export function execute(params) { return {}; }
      `;

      const validation = executionService.validateCode(code);
      expect(validation.warnings.some(w => w.includes('require'))).toBe(true);
    });

    it('should warn about fetch usage', () => {
      const code = `
        export async function execute(params) {
          const response = await fetch('https://example.com');
          return {};
        }
      `;

      const validation = executionService.validateCode(code);
      expect(validation.warnings.some(w => w.includes('fetch'))).toBe(true);
    });

    it('should warn about eval usage', () => {
      const code = `
        export function execute(params) {
          return eval(params.code);
        }
      `;

      const validation = executionService.validateCode(code);
      expect(validation.warnings.some(w => w.includes('eval'))).toBe(true);
    });
  });
});
