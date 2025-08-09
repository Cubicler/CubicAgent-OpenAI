import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../config/types.js';
import type { InternalToolResult } from '../internal-tool.interface.js';
import { BaseMemoryTool } from './base-memory-tool.js';
import { extractRequiredString, extractRequiredStringArray } from '../../utils/memory-helper.js';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { Logger } from '@/utils/logger.interface.js';

/**
 * Tool for replacing all tags on a memory
 */
export class MemoryReplaceTagsTool extends BaseMemoryTool {
  readonly toolName = 'agentmemory_replace_tags';

  constructor(memory: MemoryRepository, logger?: Logger) { super(memory, logger); }

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: 'Replace all tags for an existing memory with new tags',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Memory ID to update tags for'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'New tags array (cannot be empty)',
              minItems: 1
            }
          },
          required: ['id', 'tags']
        }
      }
    };
  }

  async execute(parameters: JSONValue): Promise<InternalToolResult> {
    try {
      const id = extractRequiredString(parameters, 'id');
      const tags = extractRequiredStringArray(parameters, 'tags');

      const tagsReplaced = await this.memory.replaceTags(id, tags);

      this.logger.info(`🏷️ Replace tags: ${id} - ${tagsReplaced ? 'success' : 'failed'}`);
      
      return {
        success: tagsReplaced,
        message: tagsReplaced ? 'Tags replaced successfully' : 'Memory not found',
        memoryId: id,
        newTags: tags
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
