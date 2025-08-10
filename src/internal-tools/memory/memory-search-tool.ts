import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../config/types.js';
import type { InternalToolResult } from '../internal-tool.interface.js';
import { BaseMemoryTool } from './base-memory-tool.js';
import { extractOptionalString, extractOptionalNumber, extractOptionalStringArray } from '../../utils/memory-helper.js';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { Logger } from '../../utils/logger.interface.js';

/**
 * Tool for searching memories
 */
export class MemorySearchTool extends BaseMemoryTool {
  readonly toolName = 'agentmemory_search';
  
  constructor(memory: MemoryRepository, logger?: Logger) { super(memory, logger); }

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: 'Search memories with flexible filtering and sorting. All parameters are optional - provide at least one search criteria (content, contentRegex, tags, or tagsRegex) for meaningful results.',
        parameters: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Optional: Search query text to match against memory content'
            },
            contentRegex: {
              type: 'string',
              description: 'Optional: Regular expression pattern to match against memory content'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional: Filter by specific tags'
            },
            tagsRegex: {
              type: 'string',
              description: 'Optional: Regular expression pattern to match against memory tags'
            },
            sortBy: {
              type: 'string',
              enum: ['importance', 'timestamp', 'both'],
              description: 'Optional: Sort results by importance, timestamp, or both'
            },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'Optional: Sort order - ascending or descending'
            },
            limit: {
              type: 'number',
              description: 'Optional: Maximum number of results (default: 10)',
              minimum: 1,
              maximum: 100
            }
          },
          required: []
        }
      }
    };
  }

  async execute(parameters: JSONValue): Promise<InternalToolResult> {
    try {
      const content = extractOptionalString(parameters, 'content');
      const contentRegex = extractOptionalString(parameters, 'contentRegex');
      const tagsRegex = extractOptionalString(parameters, 'tagsRegex');
      const sortBy = extractOptionalString(parameters, 'sortBy') as 'importance' | 'timestamp' | 'both' | undefined;
      const sortOrder = extractOptionalString(parameters, 'sortOrder') as 'asc' | 'desc' | undefined;
      const limit = extractOptionalNumber(parameters, 'limit') || 10;

      // Check if tags parameter was provided
      const hasTagsParam = typeof parameters === 'object' && parameters !== null && !Array.isArray(parameters) && 'tags' in parameters;
      const tags = hasTagsParam ? extractOptionalStringArray(parameters, 'tags') : undefined;

      // Build search options, only including defined values
      const searchOptions: {
        content?: string;
        contentRegex?: string;
        tags?: string[];
        tagsRegex?: string;
        sortBy?: 'importance' | 'timestamp' | 'both';
        sortOrder?: 'asc' | 'desc';
        limit: number;
      } = { limit };
      if (content !== undefined) searchOptions.content = content;
      if (contentRegex !== undefined) searchOptions.contentRegex = contentRegex;
      if (tags !== undefined) searchOptions.tags = tags;
      if (tagsRegex !== undefined) searchOptions.tagsRegex = tagsRegex;
      if (sortBy !== undefined) searchOptions.sortBy = sortBy;
      if (sortOrder !== undefined) searchOptions.sortOrder = sortOrder;

      const memories = await this.memory.search(searchOptions);
      
      this.logger.info(`🔍 Searched memories with options: ${JSON.stringify(searchOptions)} - Found ${memories?.length || 0} results`);
      
      return {
        success: true,
        memories: memories ? memories.map((memory) => this.formatMemoryItem(memory)) : [],
        count: memories?.length || 0,
        searchOptions: searchOptions
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private formatMemoryItem(memory: any): any {
    return memory;
  }
}
