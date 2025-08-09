import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { InternalTool, InternalToolResult } from '../internal-tool.interface.js';
import type { JSONValue } from '../../config/types.js';
import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { Logger } from '../../utils/logger.interface.js';
import { createLogger } from '../../utils/pino-logger.js';

/**
 * Base class for memory tools - provides only the memory instance
 */
export abstract class BaseMemoryTool implements InternalTool {
  abstract readonly toolName: string;
  protected memory: MemoryRepository;
  protected logger: Logger;

  constructor(memory: MemoryRepository, logger?: Logger) {
    this.memory = memory;
    this.logger = logger ?? createLogger({ silent: true });
  }

  canHandle(functionName: string): boolean {
    return functionName === this.toolName;
  }

  abstract getToolDefinition(): ChatCompletionTool;
  abstract execute(parameters: JSONValue): Promise<InternalToolResult>;
}
