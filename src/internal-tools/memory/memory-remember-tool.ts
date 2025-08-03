import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../config/types.js';
import type { InternalToolResult } from '../internal-tool.interface.js';
import { BaseMemoryTool } from './base-memory-tool.js';
import { extractRequiredString, extractOptionalNumber, extractRequiredStringArray } from '../../utils/memory-helper.js';

/**
 * Tool for remembering new memories
 */
export class MemoryRememberTool extends BaseMemoryTool {
  readonly toolName = 'agentmemory_remember';

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: 'Store a new memory with optional importance and tags',
        parameters: {
          type: 'object',
          properties: {
            sentence: {
              type: 'string',
              description: 'The memory content to store'
            },
            importance: {
              type: 'number',
              description: 'Importance level (1-10, default: 5)',
              minimum: 1,
              maximum: 10
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorizing the memory (mandatory, cannot be empty)'
            }
          },
          required: ['sentence', 'tags']
        }
      }
    };
  }

  async execute(parameters: JSONValue): Promise<InternalToolResult> {
    try {
      const sentence = extractRequiredString(parameters, 'sentence');
      const importance = extractOptionalNumber(parameters, 'importance');
      const tags = extractRequiredStringArray(parameters, 'tags');

      const memoryId = await this.memory.remember(sentence, importance, tags);

      console.log(`💾 Stored memory: ${sentence.substring(0, 50)}...`);
      
      return {
        success: true,
        message: 'Memory stored successfully',
        memoryId: memoryId,
        sentence: sentence
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
