import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../config/types.js';
import type { InternalToolResult } from '../internal-tool.interface.js';
import { BaseMemoryTool } from './base-memory-tool.js';
import { extractRequiredString, extractRequiredNumber } from '../../utils/memory-helper.js';

/**
 * Tool for editing memory importance
 */
export class MemoryEditImportanceTool extends BaseMemoryTool {
  readonly toolName = 'agentmemory_edit_importance';

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: 'Edit the importance score of an existing memory',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Memory ID to edit'
            },
            importance: {
              type: 'number',
              description: 'New importance score (0-1)',
              minimum: 0,
              maximum: 1
            }
          },
          required: ['id', 'importance']
        }
      }
    };
  }

  async execute(parameters: JSONValue): Promise<InternalToolResult> {
    try {
      const id = extractRequiredString(parameters, 'id');
      const importance = extractRequiredNumber(parameters, 'importance');

      const importanceUpdated = await this.memory.editImportance(id, importance);

      console.log(`✏️ Edit importance: ${id} - ${importanceUpdated ? 'success' : 'failed'}`);
      
      return {
        success: importanceUpdated,
        message: importanceUpdated ? 'Importance updated successfully' : 'Memory not found',
        memoryId: id,
        newImportance: importance
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
