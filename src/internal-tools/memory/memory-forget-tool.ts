import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../config/types.js';
import type { InternalToolResult } from '../internal-tool.interface.js';
import { BaseMemoryTool } from './base-memory-tool.js';
import { extractRequiredString } from '../../utils/memory-helper.js';

/**
 * Tool for forgetting/deleting memories
 */
export class MemoryForgetTool extends BaseMemoryTool {
  readonly toolName = 'agentmemory_forget';

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: 'Remove a memory completely by ID',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The memory ID to forget/delete'
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
      const deleted = await this.memory.forget(id);

      console.log(`🗑️ Memory forget: ${id} - ${deleted ? 'success' : 'not found'}`);
      
      return {
        success: deleted,
        message: deleted ? 'Memory deleted successfully' : 'Memory not found',
        deletedId: id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
