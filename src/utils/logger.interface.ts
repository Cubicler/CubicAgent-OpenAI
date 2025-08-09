export interface Logger {
  debug: (msg: string, obj?: unknown) => void;
  info: (msg: string, obj?: unknown) => void;
  warn: (msg: string, obj?: unknown) => void;
  error: (msg: string, obj?: unknown) => void;
}

