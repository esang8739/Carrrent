import { config } from './config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
}

const logLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function getLogLevel(): LogLevel {
  const level = config.serverLogLevel.toLowerCase() as LogLevel;
  return logLevels.includes(level) ? level : 'info';
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = logLevels.indexOf(getLogLevel());
  const targetLevel = logLevels.indexOf(level);
  return targetLevel >= currentLevel;
}

function formatEntry(entry: LogEntry): string {
  const timestamp = new Date().toISOString();
  const ctx = entry.context ? `[${entry.context}] ` : '';
  const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
  return `${timestamp} [${entry.level.toUpperCase()}] ${ctx}${entry.message}${data}`;
}

export const logger = {
  debug(message: string, context?: string, data?: unknown): void {
    if (shouldLog('debug')) {
      const entry: LogEntry = { timestamp: '', level: 'debug', message };
      if (context) entry.context = context;
      if (data) entry.data = data;
      console.log(formatEntry(entry));
    }
  },

  info(message: string, context?: string, data?: unknown): void {
    if (shouldLog('info')) {
      const entry: LogEntry = { timestamp: '', level: 'info', message };
      if (context) entry.context = context;
      if (data) entry.data = data;
      console.log(formatEntry(entry));
    }
  },

  warn(message: string, context?: string, data?: unknown): void {
    if (shouldLog('warn')) {
      const entry: LogEntry = { timestamp: '', level: 'warn', message };
      if (context) entry.context = context;
      if (data) entry.data = data;
      console.warn(formatEntry(entry));
    }
  },

  error(message: string, context?: string, data?: unknown): void {
    if (shouldLog('error')) {
      const entry: LogEntry = { timestamp: '', level: 'error', message };
      if (context) entry.context = context;
      if (data) entry.data = data;
      console.error(formatEntry(entry));
    }
  },

  child(context: string) {
    return {
      debug: (message: string, data?: unknown) => this.debug(message, context, data),
      info: (message: string, data?: unknown) => this.info(message, context, data),
      warn: (message: string, data?: unknown) => this.warn(message, context, data),
      error: (message: string, data?: unknown) => this.error(message, context, data),
    };
  },
};
