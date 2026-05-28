import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../src/services/auth-service';
import { TenantRepository } from '../src/repositories/tenant-repository';
import { UserRepository } from '../src/repositories/user-repository';

class MockTenantRepository {
  private tenants: Map<string, any> = new Map();

  async findByApiKey(apiKey: string) {
    for (const tenant of this.tenants.values()) {
      if (tenant.apiKey === apiKey && tenant.enabled) return tenant;
    }
    return null;
  }

  async checkQuota(tenantId: string) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error('Tenant not found');
    return {
      quotaLimit: tenant.quotaLimit,
      quotaUsed: tenant.quotaUsed,
      remaining: tenant.quotaLimit - tenant.quotaUsed,
    };
  }

  async decrementQuota(tenantId: string, amount: number = 1) {
    const tenant = this.tenants.get(tenantId);
    if (tenant) {
      tenant.quotaUsed += amount;
      this.tenants.set(tenantId, tenant);
    }
  }
}

describe('AuthService', () => {
  let tenantRepo: MockTenantRepository;
  let authService: AuthService;

  beforeEach(() => {
    tenantRepo = new MockTenantRepository();
    authService = new AuthService(
      tenantRepo as any,
      {} as UserRepository
    );
  });

  describe('validateApiKey', () => {
    it('should validate valid API key', async () => {
      const testTenant = {
        id: 'test-tenant-id',
        name: 'Test Tenant',
        apiKey: 'sk_test_valid_key',
        quotaLimit: 10000,
        quotaUsed: 0,
        enabled: true,
      };
      tenantRepo.tenants.set(testTenant.id, testTenant);

      const tenant = await authService.validateApiKey('sk_test_valid_key');
      expect(tenant.name).toBe('Test Tenant');
    });

    it('should throw error for invalid API key', async () => {
      await expect(authService.validateApiKey('invalid_key')).rejects.toThrow(
        'Invalid or expired API key'
      );
    });

    it('should throw error for disabled tenant', async () => {
      const disabledTenant = {
        id: 'disabled-tenant-id',
        name: 'Disabled Tenant',
        apiKey: 'sk_disabled_key',
        quotaLimit: 10000,
        quotaUsed: 0,
        enabled: false,
      };
      tenantRepo.tenants.set(disabledTenant.id, disabledTenant);

      await expect(authService.validateApiKey('sk_disabled_key')).rejects.toThrow(
        'Invalid or expired API key'
      );
    });
  });

  describe('checkQuota', () => {
    it('should return quota status', async () => {
      const testTenant = {
        id: 'test-tenant-id',
        name: 'Test Tenant',
        apiKey: 'sk_test_key',
        quotaLimit: 10000,
        quotaUsed: 2500,
        enabled: true,
      };
      tenantRepo.tenants.set(testTenant.id, testTenant);

      const status = await authService.checkQuota(testTenant.id);
      expect(status.quotaLimit).toBe(10000);
      expect(status.quotaUsed).toBe(2500);
      expect(status.remaining).toBe(7500);
    });

    it('should throw error for non-existent tenant', async () => {
      await expect(authService.checkQuota('non-existent-id')).rejects.toThrow(
        'Tenant not found'
      );
    });
  });

  describe('decrementQuota', () => {
    it('should decrement quota by 1', async () => {
      const testTenant = {
        id: 'test-tenant-id',
        name: 'Test Tenant',
        apiKey: 'sk_test_key',
        quotaLimit: 10000,
        quotaUsed: 100,
        enabled: true,
      };
      tenantRepo.tenants.set(testTenant.id, testTenant);

      await authService.decrementQuota(testTenant.id, 1);
      const status = await authService.checkQuota(testTenant.id);
      expect(status.quotaUsed).toBe(101);
    });

    it('should decrement quota by specified amount', async () => {
      const testTenant = {
        id: 'test-tenant-id',
        name: 'Test Tenant',
        apiKey: 'sk_test_key',
        quotaLimit: 10000,
        quotaUsed: 100,
        enabled: true,
      };
      tenantRepo.tenants.set(testTenant.id, testTenant);

      await authService.decrementQuota(testTenant.id, 50);
      const status = await authService.checkQuota(testTenant.id);
      expect(status.quotaUsed).toBe(150);
    });
  });
});
