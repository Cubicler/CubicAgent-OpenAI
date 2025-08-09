import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../config/types.js';
import type { InternalToolResult } from '../internal-tool.interface.js';
import { BaseMemoryTool } from './base-memory-tool.js';
import { extractRequiredString } from '../../utils/memory-helper.js';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { Logger } from '../../utils/logger.interface.js';

/**
 * Tool for removing tags from memories
 */
export class MemoryRemoveTagTool extends BaseMemoryTool {
  readonly toolName = 'agentmemory_remove_tag';
  
  constructor(memory: MemoryRepository, logger?: Logger) { super(memory, logger); }

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: 'Remove a tag from an existing memory (will throw error if it would result in empty tags)',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Memory ID to remove tag from'
            },
            tag: {
              type: 'string',
              description: 'Tag to remove'
            }
          },
          required: ['id', 'tag']
        }
      }
    };
  }

  async execute(parameters: JSONValue): Promise<InternalToolResult> {
    try {
      const id = extractRequiredString(parameters, 'id');
      const tag = extractRequiredString(parameters, 'tag');

      const tagRemoved = await this.memory.removeTag(id, tag);

      this.logger.info(`🏷️ Remove tag: ${id} - ${tagRemoved ? 'success' : 'failed'}`);
      
      return {
        success: tagRemoved,
        message: tagRemoved ? 'Tag removed successfully' : 'Memory not found or tag does not exist',
        memoryId: id,
        tag: tag
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
