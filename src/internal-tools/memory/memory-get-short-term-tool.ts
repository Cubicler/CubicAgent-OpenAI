import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../config/types.js';
import type { InternalToolResult } from '../internal-tool.interface.js';
import { BaseMemoryTool } from './base-memory-tool.js';

/**
 * Tool for getting short-term memories
 */
export class MemoryGetShortTermTool extends BaseMemoryTool {
  readonly toolName = 'agentmemory_get_short_term';

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

      console.log(`📋 Short-term memories: ${shortTermMemories.length} items`);
      
      return {
        success: true,
        memories: shortTermMemories.map((item: any) => this.formatMemoryItem(item)),
        count: shortTermMemories.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private formatMemoryItem(memory: any): any {
    return {
      id: memory.id || memory.memoryId,
      sentence: memory.sentence || memory.content,
      importance: memory.importance || 5,
      tags: Array.isArray(memory.tags) ? memory.tags : [],
      createdAt: memory.createdAt || new Date().toISOString(),
      updatedAt: memory.updatedAt || new Date().toISOString()
    };
  }
}
