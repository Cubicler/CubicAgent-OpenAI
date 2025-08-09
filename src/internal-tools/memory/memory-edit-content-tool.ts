import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../config/types.js';
import type { InternalToolResult } from '../internal-tool.interface.js';
import { BaseMemoryTool } from './base-memory-tool.js';
import { extractRequiredString } from '../../utils/memory-helper.js';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { Logger } from '@/utils/logger.interface.js';

/**
 * Tool for editing memory content
 */
export class MemoryEditContentTool extends BaseMemoryTool {
  readonly toolName = 'agentmemory_edit_content';

  constructor(memory: MemoryRepository, logger: Logger) {
    super(memory, logger);
  }

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: 'Edit the content/sentence of an existing memory',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Memory ID to edit'
            },
            sentence: {
              type: 'string',
              description: 'New memory sentence'
            }
          },
          required: ['id', 'sentence']
        }
      }
    };
  }

  async execute(parameters: JSONValue): Promise<InternalToolResult> {
    try {
      const id = extractRequiredString(parameters, 'id');
      const sentence = extractRequiredString(parameters, 'sentence');

      const contentUpdated = await this.memory.editContent(id, sentence);

      this.logger.info(`✏️ Edit content: ${id} - ${contentUpdated ? 'success' : 'failed'}`);
      
      return {
        success: contentUpdated,
        message: contentUpdated ? 'Content updated successfully' : 'Memory not found',
        memoryId: id,
        newSentence: sentence
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
