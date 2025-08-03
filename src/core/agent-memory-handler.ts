import type { MemoryRepository, AgentMemory } from '@cubicler/cubicagentkit';
import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';

/**
 * AgentMemoryHandler
 * Handles all memory-related MCP operations and tool definitions
 * 
 * Key Responsibilities:
 * - Build memory tool definitions aligned with MemoryRepository interface
 * - Execute memory function calls with proper parameter handling
 * - Provide consistent error handling for memory operations
 * - Map MemoryRepository methods to GPT function calls
 */
export class AgentMemoryHandler {
  private memory: MemoryRepository;

  constructor(memory: MemoryRepository) {
    this.memory = memory;
  }

  /**
   * Build memory tool definitions for GPT function calling
   * Aligned with MemoryRepository interface methods
   */
  buildMemoryTools(): ChatCompletionTool[] {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'memory_remember',
          description: 'Store important information as a sentence in long-term memory',
          parameters: {
            type: 'object',
            properties: {
              sentence: {
                type: 'string',
                description: 'The memory sentence to store (e.g., "John prefers direct communication")'
              },
              importance: {
                type: 'number',
                description: 'Importance score between 0 and 1 (optional, uses config default if not provided)',
                minimum: 0,
                maximum: 1
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Memory tags for categorization (mandatory, cannot be empty)',
                minItems: 1
              }
            },
            required: ['sentence', 'tags']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'memory_recall',
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
      },
      {
        type: 'function' as const,
        function: {
          name: 'memory_search',
          description: 'Search memories with flexible filtering and sorting options',
          parameters: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Search query for memory content'
              },
              contentRegex: {
                type: 'string',
                description: 'Regular expression pattern for content search'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of tags to filter by'
              },
              tagsRegex: {
                type: 'string',
                description: 'Regular expression pattern for tag search'
              },
              sortBy: {
                type: 'string',
                enum: ['importance', 'timestamp', 'both'],
                description: 'Sort criteria for results'
              },
              sortOrder: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort order for results'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                minimum: 1
              }
            }
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'memory_get_short_term',
          description: 'Get short-term memories for prompt inclusion (within token capacity)',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'memory_forget',
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
      },
      {
        type: 'function' as const,
        function: {
          name: 'memory_add_to_short_term',
          description: 'Add a memory to short-term storage (LRU management)',
          parameters: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Memory ID to add to short-term storage'
              }
            },
            required: ['id']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'memory_edit_importance',
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
      },
      {
        type: 'function' as const,
        function: {
          name: 'memory_edit_content',
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
      },
      {
        type: 'function' as const,
        function: {
          name: 'memory_add_tag',
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
      },
      {
        type: 'function' as const,
        function: {
          name: 'memory_remove_tag',
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
      },
      {
        type: 'function' as const,
        function: {
          name: 'memory_replace_tags',
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
      }
    ];
  }

  /**
   * Check if a function name is a memory function
   */
  isMemoryFunction(functionName: string): boolean {
    return functionName.startsWith('memory_');
  }

  /**
   * Execute memory function calls with proper parameter handling and error management
   */
  async executeMemoryFunction(functionName: string, parameters: Record<string, any>): Promise<unknown> { // eslint-disable-line @typescript-eslint/no-explicit-any -- Tool parameters can be any valid JSON
    try {
      switch (functionName) {
        case 'memory_remember':
          const memoryId = await this.memory.remember(
            parameters['sentence'] as string,
            parameters['importance'] as number | undefined,
            parameters['tags'] as string[]
          );
          console.log(`💾 Stored memory: ${(parameters['sentence'] as string).substring(0, 50)}...`);
          return {
            success: true,
            message: 'Memory stored successfully',
            memoryId: memoryId,
            sentence: parameters['sentence']
          };

        case 'memory_recall':
          const memory = await this.memory.recall(parameters['id'] as string);
          console.log(`📋 Recalled memory: ${parameters['id']}`);
          return {
            success: true,
            memory: memory ? this.formatMemoryItem(memory) : null,
            found: memory !== null
          };

        case 'memory_search':
          const searchOptions = this.buildSearchOptions(parameters);
          const searchResults = await this.memory.search(searchOptions);
          console.log(`🔍 Memory search: ${searchResults.length} results found`);
          return {
            success: true,
            results: searchResults.map(item => this.formatMemoryItem(item)),
            count: searchResults.length
          };

        case 'memory_get_short_term':
          const shortTermMemories = this.memory.getShortTermMemories();
          console.log(`📋 Short-term memories: ${shortTermMemories.length} items`);
          return {
            success: true,
            memories: shortTermMemories.map(item => this.formatMemoryItem(item)),
            count: shortTermMemories.length
          };

        case 'memory_forget':
          const deleted = await this.memory.forget(parameters['id'] as string);
          console.log(`🗑️ Memory forget: ${parameters['id']} - ${deleted ? 'success' : 'not found'}`);
          return {
            success: deleted,
            message: deleted ? 'Memory deleted successfully' : 'Memory not found',
            deletedId: parameters['id']
          };

        case 'memory_add_to_short_term':
          const added = await this.memory.addToShortTermMemory(parameters['id'] as string);
          console.log(`➕ Add to short-term: ${parameters['id']} - ${added ? 'success' : 'failed'}`);
          return {
            success: added,
            message: added ? 'Memory added to short-term storage' : 'Memory not found or already in short-term',
            memoryId: parameters['id']
          };

        case 'memory_edit_importance':
          const importanceUpdated = await this.memory.editImportance(
            parameters['id'] as string,
            parameters['importance'] as number
          );
          console.log(`✏️ Edit importance: ${parameters['id']} - ${importanceUpdated ? 'success' : 'failed'}`);
          return {
            success: importanceUpdated,
            message: importanceUpdated ? 'Importance updated successfully' : 'Memory not found',
            memoryId: parameters['id'],
            newImportance: parameters['importance']
          };

        case 'memory_edit_content':
          const contentUpdated = await this.memory.editContent(
            parameters['id'] as string,
            parameters['sentence'] as string
          );
          console.log(`✏️ Edit content: ${parameters['id']} - ${contentUpdated ? 'success' : 'failed'}`);
          return {
            success: contentUpdated,
            message: contentUpdated ? 'Content updated successfully' : 'Memory not found',
            memoryId: parameters['id'],
            newSentence: parameters['sentence']
          };

        case 'memory_add_tag':
          const tagAdded = await this.memory.addTag(
            parameters['id'] as string,
            parameters['tag'] as string
          );
          console.log(`🏷️ Add tag: ${parameters['id']} - ${tagAdded ? 'success' : 'failed'}`);
          return {
            success: tagAdded,
            message: tagAdded ? 'Tag added successfully' : 'Memory not found or tag already exists',
            memoryId: parameters['id'],
            tag: parameters['tag']
          };

        case 'memory_remove_tag':
          const tagRemoved = await this.memory.removeTag(
            parameters['id'] as string,
            parameters['tag'] as string
          );
          console.log(`🏷️ Remove tag: ${parameters['id']} - ${tagRemoved ? 'success' : 'failed'}`);
          return {
            success: tagRemoved,
            message: tagRemoved ? 'Tag removed successfully' : 'Memory not found or tag does not exist',
            memoryId: parameters['id'],
            tag: parameters['tag']
          };

        case 'memory_replace_tags':
          const tagsReplaced = await this.memory.replaceTags(
            parameters['id'] as string,
            parameters['tags'] as string[]
          );
          console.log(`🏷️ Replace tags: ${parameters['id']} - ${tagsReplaced ? 'success' : 'failed'}`);
          return {
            success: tagsReplaced,
            message: tagsReplaced ? 'Tags replaced successfully' : 'Memory not found',
            memoryId: parameters['id'],
            newTags: parameters['tags']
          };

        default:
          return {
            error: `Unknown memory function: ${functionName}`,
            success: false
          };
      }
    } catch (error) {
      console.error(`❌ Memory function ${functionName} failed:`, error);
      return {
        error: `Memory operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false,
        functionName
      };
    }
  }

  /**
   * Build search options from parameters
   */
  private buildSearchOptions(parameters: Record<string, any>): any { // eslint-disable-line @typescript-eslint/no-explicit-any -- Search options can have various types
    const options: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any -- Building dynamic options object
    
    if (parameters['content']) options.content = parameters['content'];
    if (parameters['contentRegex']) options.contentRegex = parameters['contentRegex'];
    if (parameters['tags']) options.tags = parameters['tags'];
    if (parameters['tagsRegex']) options.tagsRegex = parameters['tagsRegex'];
    if (parameters['sortBy']) options.sortBy = parameters['sortBy'];
    if (parameters['sortOrder']) options.sortOrder = parameters['sortOrder'];
    if (parameters['limit']) options.limit = parameters['limit'];
    
    return options;
  }

  /**
   * Format memory item for consistent JSON response
   */
  private formatMemoryItem(memory: AgentMemory): object {
    return {
      id: memory.id,
      sentence: memory.sentence,
      importance: memory.importance,
      tags: memory.tags
    };
  }
}
