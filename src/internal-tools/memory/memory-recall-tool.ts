import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../config/types.js';
import type { InternalToolResult } from '../internal-tool.interface.js';
import { BaseMemoryTool } from './base-memory-tool.js';
import { extractRequiredString } from '../../utils/memory-helper.js';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { Logger } from '@/utils/logger.interface.js';

/**
 * Tool for recalling specific memories by ID
 */
export class MemoryRecallTool extends BaseMemoryTool {
  readonly toolName = 'agentmemory_recall';

  constructor(memory: MemoryRepository, logger?: Logger) { super(memory, logger); }

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: 'Recall a specific memory by its ID',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The memory ID to recall'
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
      const memory = await this.memory.recall(id);

      this.logger.info(`📋 Recalled memory: ${id}`);
      
      return {
        success: true,
        memory: memory ? this.formatMemoryItem(memory) : null,
        found: memory !== null
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
