import type { Logger } from './logger.interface.js';
import pino, { type Logger as PinoLogger } from 'pino';

export type LoggerLevel = 'silent' | 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface CreateLoggerOptions {
  level?: LoggerLevel;
  silent?: boolean;
}

class PinoWrappedLogger implements Logger {
  constructor(private readonly p: PinoLogger, private readonly silent = false) {}
  private skip(): boolean { return this.silent || this.p?.level === 'silent'; }
  debug(msg: string, obj?: unknown): void { if (!this.skip()) { this.p.debug(obj ?? {}, msg); console.debug(msg, obj ?? ''); } }
  info(msg: string, obj?: unknown): void {
    if (!this.skip()) {
      this.p.info(obj ?? {}, msg);
      // also mirror to console for backwards-compat tests (non-stdio)
      console.log(msg);
    }
  }
  warn(msg: string, obj?: unknown): void {
    this.p.warn(obj ?? {}, msg);
    if (obj !== undefined) console.warn(msg, obj);
    else console.warn(msg);
  }
  error(msg: string, obj?: unknown): void {
    this.p.error(obj ?? {}, msg);
    console.error(msg, obj ?? '');
  }
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const level = options.silent ? 'silent' : (options.level ?? 'info');
  const p = pino({ level });
  return new PinoWrappedLogger(p, level === 'silent');
}
