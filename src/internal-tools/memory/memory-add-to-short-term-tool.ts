import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../config/types.js';
import type { InternalToolResult } from '../internal-tool.interface.js';
import { BaseMemoryTool } from './base-memory-tool.js';
import { extractRequiredString } from '../../utils/memory-helper.js';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { Logger } from '../../utils/logger.interface.js';

/**
 * Tool for adding memories to short-term storage
 */
export class MemoryAddToShortTermTool extends BaseMemoryTool {
  readonly toolName = 'agentmemory_add_to_short_term';

  constructor(memory: MemoryRepository, logger?: Logger) { super(memory, logger); }

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: 'Add a memory to short-term storage (LRU management)',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Memory ID to add to short-term storage'
            }
          },
          required: ['id']
        }
      }
    };
  }

  async execute(parameters: JSONValue): Promise<InternalToolResult> {
    try {
      const id = extractRequiredString(parameters, 'id');
      const added = await this.memory.addToShortTermMemory(id);

      this.logger.info(`➕ Add to short-term: ${id} - ${added ? 'success' : 'failed'}`);
      
      return {
        success: added,
        message: added ? 'Memory added to short-term storage' : 'Memory not found or already in short-term',
        memoryId: id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
