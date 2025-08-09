import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../config/types.js';
import type { InternalToolResult } from '../internal-tool.interface.js';
import { BaseMemoryTool } from './base-memory-tool.js';
import { extractRequiredString } from '../../utils/memory-helper.js';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { Logger } from '../../utils/logger.interface.js';

/**
 * Tool for adding tags to memories
 */
export class MemoryAddTagTool extends BaseMemoryTool {
  readonly toolName = 'agentmemory_add_tag';

  constructor(memory: MemoryRepository, logger?: Logger) { super(memory, logger); }

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: 'Add a tag to an existing memory',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Memory ID to add tag to'
            },
            tag: {
              type: 'string',
              description: 'Tag to add'
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
      
      const tagAdded = await this.memory.addTag(id, tag);
      
      this.logger.info(`🏷️ Add tag: ${id} - ${tagAdded ? 'success' : 'failed'}`);
      
      return {
        success: tagAdded,
        message: tagAdded ? 'Tag added successfully' : 'Memory not found or tag already exists',
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
