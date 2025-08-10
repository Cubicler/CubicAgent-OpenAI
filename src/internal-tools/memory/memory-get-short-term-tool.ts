import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../config/types.js';
import type { InternalToolResult } from '../internal-tool.interface.js';
import { BaseMemoryTool } from './base-memory-tool.js';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { Logger } from '../../utils/logger.interface.js';


/**
 * Tool for getting short-term memories
 */
export class MemoryGetShortTermTool extends BaseMemoryTool {
  readonly toolName = 'agentmemory_get_short_term';

  constructor(memory: MemoryRepository, logger?: Logger) { super(memory, logger); }

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: 'Get short-term memories for prompt inclusion (within token capacity)',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    };
  }

  async execute(_parameters: JSONValue): Promise<InternalToolResult> {
    try {
      const shortTermMemories = this.memory.getShortTermMemories();

      this.logger.info(`📋 Short-term memories: ${shortTermMemories.length} items`);
      
      return {
        success: true,
        memories: shortTermMemories,
        count: shortTermMemories.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
