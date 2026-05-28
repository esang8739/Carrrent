import { AuditLogRepository } from '../repositories/audit-log-repository.js';
import { AuditLogQuery, Metrics } from '../models/audit-log.js';
import { logger } from '../utils/logger.js';

const auditLogger = logger.child('audit');

export interface AuditEvent {
  tenantId: string;
  skillId: string;
  userId?: string;
  status: 'success' | 'error' | 'timeout';
  durationMs: number;
  errorMessage?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export class AuditLoggerService {
  private buffer: AuditEvent[] = [];
  private bufferSize = 100;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(private repo: AuditLogRepository) {
    this.startFlushTimer();
  }

  async log(event: AuditEvent): Promise<void> {
    this.buffer.push(event);

    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logs = this.buffer.splice(0, this.bufferSize);

    try {
      await this.repo.createMultiple(
        logs.map((event) => ({
          tenantId: event.tenantId,
          skillId: event.skillId,
          userId: event.userId,
          status: event.status,
          durationMs: event.durationMs,
          errorMessage: event.errorMessage,
          input: event.input,
          output: event.output,
        }))
      );
      auditLogger.debug('Audit logs flushed', { count: logs.length });
    } catch (error) {
      auditLogger.error('Failed to flush audit logs', { error });
      this.buffer.unshift(...logs);
    }
  }

  private startFlushTimer() {
    this.flushInterval = setInterval(async () => {
      await this.flush();
    }, 5000);

    process.on('beforeExit', async () => {
      await this.flush();
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
      }
    });

    process.on('SIGINT', async () => {
      await this.flush();
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
      }
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.flush();
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
      }
      process.exit(0);
    });
  }

  async query(params: AuditLogQuery) {
    return this.repo.query(params);
  }

  async count(params: Omit<AuditLogQuery, 'limit' | 'offset'>): Promise<number> {
    return this.repo.count(params);
  }

  async getMetrics(tenantId: string, windowMs: number = 3600000): Promise<Metrics> {
    const now = new Date();
    const startDate = new Date(now.getTime() - windowMs);

    const logs = await this.repo.query({
      tenantId,
      startDate,
      endDate: now,
      limit: 10000,
      offset: 0,
    });

    if (logs.length === 0) {
      return {
        qps: 0,
        p99Latency: 0,
        p95Latency: 0,
        errorRate: 0,
        totalRequests: 0,
      };
    }

    const totalRequests = logs.length;
    const errorCount = logs.filter((log) => log.status === 'error' || log.status === 'timeout').length;
    const durations = logs.map((log) => log.durationMs).sort((a, b) => a - b);

    const p99Index = Math.floor(durations.length * 0.99);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Latency = durations[p99Index] || 0;
    const p95Latency = durations[p95Index] || 0;

    const windowSeconds = windowMs / 1000;
    const qps = totalRequests / windowSeconds;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

    return {
      qps: parseFloat(qps.toFixed(3)),
      p99Latency,
      p95Latency,
      errorRate: parseFloat(errorRate.toFixed(4)),
      totalRequests,
    };
  }

  async destroy() {
    await this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}
