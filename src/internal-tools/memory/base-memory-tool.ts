import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { InternalTool, InternalToolResult } from '../internal-tool.interface.js';
import type { JSONValue } from '../../config/types.js';
import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';

/**
 * Base class for memory tools - provides only the memory instance
 */
export abstract class BaseMemoryTool implements InternalTool {
  abstract readonly toolName: string;
  protected memory: MemoryRepository;

  constructor(memory: MemoryRepository) {
    this.memory = memory;
  }

  canHandle(functionName: string): boolean {
    return functionName === this.toolName;
  }

  abstract getToolDefinition(): ChatCompletionTool;
  abstract execute(parameters: JSONValue): Promise<InternalToolResult>;
}
