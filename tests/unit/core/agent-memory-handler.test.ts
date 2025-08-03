import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AgentMemoryHandler } from '../../../src/core/agent-memory-handler.js';
import type { MemoryRepository, AgentMemory } from '@cubicler/cubicagentkit';

// Mock MemoryRepository
const createMockMemoryRepository = (): MemoryRepository => ({
  remember: vi.fn(),
  recall: vi.fn(),
  search: vi.fn(),
  getShortTermMemories: vi.fn(),
  addToShortTermMemory: vi.fn(),
  editImportance: vi.fn(),
  editContent: vi.fn(),
  addTag: vi.fn(),
  removeTag: vi.fn(),
  replaceTags: vi.fn(),
  forget: vi.fn()
});

// Mock AgentMemory data
const createMockMemory = (id: string, sentence: string, importance: number = 0.5, tags: string[] = ['test']): AgentMemory => ({
  id,
  sentence,
  importance,
  tags
});

describe('AgentMemoryHandler', () => {
  let memoryRepository: MemoryRepository;
  let memoryHandler: AgentMemoryHandler;

  beforeEach(() => {
    memoryRepository = createMockMemoryRepository();
    memoryHandler = new AgentMemoryHandler(memoryRepository);
  });

  describe('constructor', () => {
    it('should initialize with memory repository', () => {
      expect(memoryHandler).toBeInstanceOf(AgentMemoryHandler);
    });
  });

  describe('buildMemoryTools', () => {
    it('should return array of memory tools', () => {
      const tools = memoryHandler.buildMemoryTools();
      
      expect(tools).toHaveLength(11);
      expect(tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'function',
            function: expect.objectContaining({
              name: 'memory_remember',
              description: expect.any(String),
              parameters: expect.any(Object)
            })
          })
        ])
      );
    });

    it('should include all expected memory function names', () => {
      const tools = memoryHandler.buildMemoryTools();
      const functionNames = tools.map(tool => tool.function.name);
      
      expect(functionNames).toContain('memory_remember');
      expect(functionNames).toContain('memory_recall');
      expect(functionNames).toContain('memory_search');
      expect(functionNames).toContain('memory_get_short_term');
      expect(functionNames).toContain('memory_forget');
      expect(functionNames).toContain('memory_add_to_short_term');
      expect(functionNames).toContain('memory_edit_importance');
      expect(functionNames).toContain('memory_edit_content');
      expect(functionNames).toContain('memory_add_tag');
      expect(functionNames).toContain('memory_remove_tag');
      expect(functionNames).toContain('memory_replace_tags');
    });

    it('should have proper parameter definitions for memory_remember', () => {
      const tools = memoryHandler.buildMemoryTools();
      const rememberTool = tools.find(tool => tool.function.name === 'memory_remember');
      
      expect(rememberTool?.function.parameters).toEqual({
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
      });
    });
  });

  describe('isMemoryFunction', () => {
    it('should return true for memory function names', () => {
      expect(memoryHandler.isMemoryFunction('memory_remember')).toBe(true);
      expect(memoryHandler.isMemoryFunction('memory_search')).toBe(true);
      expect(memoryHandler.isMemoryFunction('memory_recall')).toBe(true);
    });

    it('should return false for non-memory function names', () => {
      expect(memoryHandler.isMemoryFunction('other_function')).toBe(false);
      expect(memoryHandler.isMemoryFunction('cubicler_tool')).toBe(false);
      expect(memoryHandler.isMemoryFunction('search_web')).toBe(false);
    });
  });

  describe('executeMemoryFunction', () => {
    describe('memory_remember', () => {
      it('should store memory successfully', async () => {
        const mockMemoryId = 'mem_123';
        (memoryRepository.remember as Mock).mockResolvedValue(mockMemoryId);

        const parameters = {
          sentence: 'John prefers direct communication',
          importance: 0.8,
          tags: ['user-preference', 'communication']
        };

        const result = await memoryHandler.executeMemoryFunction('memory_remember', parameters);

        expect(memoryRepository.remember).toHaveBeenCalledWith(
          'John prefers direct communication',
          0.8,
          ['user-preference', 'communication']
        );
        expect(result).toEqual({
          success: true,
          message: 'Memory stored successfully',
          memoryId: mockMemoryId,
          sentence: 'John prefers direct communication'
        });
      });

      it('should handle undefined importance', async () => {
        const mockMemoryId = 'mem_123';
        (memoryRepository.remember as Mock).mockResolvedValue(mockMemoryId);

        const parameters = {
          sentence: 'Test memory',
          tags: ['test']
        };

        await memoryHandler.executeMemoryFunction('memory_remember', parameters);

        expect(memoryRepository.remember).toHaveBeenCalledWith(
          'Test memory',
          undefined,
          ['test']
        );
      });
    });

    describe('memory_recall', () => {
      it('should recall memory successfully when found', async () => {
        const mockMemory = createMockMemory('mem_123', 'Test memory', 0.7, ['test']);
        (memoryRepository.recall as Mock).mockResolvedValue(mockMemory);

        const parameters = { id: 'mem_123' };
        const result = await memoryHandler.executeMemoryFunction('memory_recall', parameters);

        expect(memoryRepository.recall).toHaveBeenCalledWith('mem_123');
        expect(result).toEqual({
          success: true,
          memory: {
            id: 'mem_123',
            sentence: 'Test memory',
            importance: 0.7,
            tags: ['test']
          },
          found: true
        });
      });

      it('should handle memory not found', async () => {
        (memoryRepository.recall as Mock).mockResolvedValue(null);

        const parameters = { id: 'nonexistent' };
        const result = await memoryHandler.executeMemoryFunction('memory_recall', parameters);

        expect(result).toEqual({
          success: true,
          memory: null,
          found: false
        });
      });
    });

    describe('memory_search', () => {
      it('should search memories with various options', async () => {
        const mockMemories = [
          createMockMemory('mem_1', 'First memory', 0.8, ['tag1']),
          createMockMemory('mem_2', 'Second memory', 0.6, ['tag2'])
        ];
        (memoryRepository.search as Mock).mockResolvedValue(mockMemories);

        const parameters = {
          content: 'test query',
          tags: ['tag1'],
          sortBy: 'importance',
          sortOrder: 'desc',
          limit: 10
        };

        const result = await memoryHandler.executeMemoryFunction('memory_search', parameters);

        expect(memoryRepository.search).toHaveBeenCalledWith({
          content: 'test query',
          tags: ['tag1'],
          sortBy: 'importance',
          sortOrder: 'desc',
          limit: 10
        });
        expect(result).toEqual({
          success: true,
          results: [
            { id: 'mem_1', sentence: 'First memory', importance: 0.8, tags: ['tag1'] },
            { id: 'mem_2', sentence: 'Second memory', importance: 0.6, tags: ['tag2'] }
          ],
          count: 2
        });
      });

      it('should handle empty search results', async () => {
        (memoryRepository.search as Mock).mockResolvedValue([]);

        const parameters = { content: 'nonexistent' };
        const result = await memoryHandler.executeMemoryFunction('memory_search', parameters);

        expect(result).toEqual({
          success: true,
          results: [],
          count: 0
        });
      });
    });

    describe('memory_get_short_term', () => {
      it('should get short-term memories', async () => {
        const mockMemories = [
          createMockMemory('mem_1', 'Recent memory 1', 0.9, ['recent']),
          createMockMemory('mem_2', 'Recent memory 2', 0.7, ['recent'])
        ];
        (memoryRepository.getShortTermMemories as Mock).mockReturnValue(mockMemories);

        const result = await memoryHandler.executeMemoryFunction('memory_get_short_term', {});

        expect(memoryRepository.getShortTermMemories).toHaveBeenCalled();
        expect(result).toEqual({
          success: true,
          memories: [
            { id: 'mem_1', sentence: 'Recent memory 1', importance: 0.9, tags: ['recent'] },
            { id: 'mem_2', sentence: 'Recent memory 2', importance: 0.7, tags: ['recent'] }
          ],
          count: 2
        });
      });
    });

    describe('memory_forget', () => {
      it('should delete memory successfully', async () => {
        (memoryRepository.forget as Mock).mockResolvedValue(true);

        const parameters = { id: 'mem_123' };
        const result = await memoryHandler.executeMemoryFunction('memory_forget', parameters);

        expect(memoryRepository.forget).toHaveBeenCalledWith('mem_123');
        expect(result).toEqual({
          success: true,
          message: 'Memory deleted successfully',
          deletedId: 'mem_123'
        });
      });

      it('should handle memory not found for deletion', async () => {
        (memoryRepository.forget as Mock).mockResolvedValue(false);

        const parameters = { id: 'nonexistent' };
        const result = await memoryHandler.executeMemoryFunction('memory_forget', parameters);

        expect(result).toEqual({
          success: false,
          message: 'Memory not found',
          deletedId: 'nonexistent'
        });
      });
    });

    describe('memory_add_to_short_term', () => {
      it('should add memory to short-term successfully', async () => {
        (memoryRepository.addToShortTermMemory as Mock).mockResolvedValue(true);

        const parameters = { id: 'mem_123' };
        const result = await memoryHandler.executeMemoryFunction('memory_add_to_short_term', parameters);

        expect(memoryRepository.addToShortTermMemory).toHaveBeenCalledWith('mem_123');
        expect(result).toEqual({
          success: true,
          message: 'Memory added to short-term storage',
          memoryId: 'mem_123'
        });
      });

      it('should handle failure to add to short-term', async () => {
        (memoryRepository.addToShortTermMemory as Mock).mockResolvedValue(false);

        const parameters = { id: 'mem_123' };
        const result = await memoryHandler.executeMemoryFunction('memory_add_to_short_term', parameters);

        expect(result).toEqual({
          success: false,
          message: 'Memory not found or already in short-term',
          memoryId: 'mem_123'
        });
      });
    });

    describe('memory_edit_importance', () => {
      it('should edit importance successfully', async () => {
        (memoryRepository.editImportance as Mock).mockResolvedValue(true);

        const parameters = { id: 'mem_123', importance: 0.9 };
        const result = await memoryHandler.executeMemoryFunction('memory_edit_importance', parameters);

        expect(memoryRepository.editImportance).toHaveBeenCalledWith('mem_123', 0.9);
        expect(result).toEqual({
          success: true,
          message: 'Importance updated successfully',
          memoryId: 'mem_123',
          newImportance: 0.9
        });
      });
    });

    describe('memory_edit_content', () => {
      it('should edit content successfully', async () => {
        (memoryRepository.editContent as Mock).mockResolvedValue(true);

        const parameters = { id: 'mem_123', sentence: 'Updated sentence' };
        const result = await memoryHandler.executeMemoryFunction('memory_edit_content', parameters);

        expect(memoryRepository.editContent).toHaveBeenCalledWith('mem_123', 'Updated sentence');
        expect(result).toEqual({
          success: true,
          message: 'Content updated successfully',
          memoryId: 'mem_123',
          newSentence: 'Updated sentence'
        });
      });
    });

    describe('memory_add_tag', () => {
      it('should add tag successfully', async () => {
        (memoryRepository.addTag as Mock).mockResolvedValue(true);

        const parameters = { id: 'mem_123', tag: 'new-tag' };
        const result = await memoryHandler.executeMemoryFunction('memory_add_tag', parameters);

        expect(memoryRepository.addTag).toHaveBeenCalledWith('mem_123', 'new-tag');
        expect(result).toEqual({
          success: true,
          message: 'Tag added successfully',
          memoryId: 'mem_123',
          tag: 'new-tag'
        });
      });
    });

    describe('memory_remove_tag', () => {
      it('should remove tag successfully', async () => {
        (memoryRepository.removeTag as Mock).mockResolvedValue(true);

        const parameters = { id: 'mem_123', tag: 'old-tag' };
        const result = await memoryHandler.executeMemoryFunction('memory_remove_tag', parameters);

        expect(memoryRepository.removeTag).toHaveBeenCalledWith('mem_123', 'old-tag');
        expect(result).toEqual({
          success: true,
          message: 'Tag removed successfully',
          memoryId: 'mem_123',
          tag: 'old-tag'
        });
      });
    });

    describe('memory_replace_tags', () => {
      it('should replace tags successfully', async () => {
        (memoryRepository.replaceTags as Mock).mockResolvedValue(true);

        const parameters = { id: 'mem_123', tags: ['new-tag1', 'new-tag2'] };
        const result = await memoryHandler.executeMemoryFunction('memory_replace_tags', parameters);

        expect(memoryRepository.replaceTags).toHaveBeenCalledWith('mem_123', ['new-tag1', 'new-tag2']);
        expect(result).toEqual({
          success: true,
          message: 'Tags replaced successfully',
          memoryId: 'mem_123',
          newTags: ['new-tag1', 'new-tag2']
        });
      });
    });

    describe('unknown function', () => {
      it('should handle unknown memory function', async () => {
        const result = await memoryHandler.executeMemoryFunction('memory_unknown', {});

        expect(result).toEqual({
          error: 'Unknown memory function: memory_unknown',
          success: false
        });
      });
    });

    describe('error handling', () => {
      it('should handle repository errors gracefully', async () => {
        const mockError = new Error('Repository error');
        (memoryRepository.remember as Mock).mockRejectedValue(mockError);

        const parameters = {
          sentence: 'Test memory',
          tags: ['test']
        };

        const result = await memoryHandler.executeMemoryFunction('memory_remember', parameters);

        expect(result).toEqual({
          error: 'Memory operation failed: Repository error',
          success: false,
          functionName: 'memory_remember'
        });
      });

      it('should handle unknown errors', async () => {
        (memoryRepository.remember as Mock).mockRejectedValue('Unknown error');

        const parameters = {
          sentence: 'Test memory',
          tags: ['test']
        };

        const result = await memoryHandler.executeMemoryFunction('memory_remember', parameters);

        expect(result).toEqual({
          error: 'Memory operation failed: Unknown error',
          success: false,
          functionName: 'memory_remember'
        });
      });
    });
  });

  describe('buildSearchOptions', () => {
    it('should build search options with all parameters', async () => {
      const mockMemories = [createMockMemory('mem_1', 'Test', 0.5, ['test'])];
      (memoryRepository.search as Mock).mockResolvedValue(mockMemories);

      const parameters = {
        content: 'test content',
        contentRegex: 'test.*',
        tags: ['tag1', 'tag2'],
        tagsRegex: 'tag.*',
        sortBy: 'importance',
        sortOrder: 'desc',
        limit: 5
      };

      await memoryHandler.executeMemoryFunction('memory_search', parameters);

      expect(memoryRepository.search).toHaveBeenCalledWith({
        content: 'test content',
        contentRegex: 'test.*',
        tags: ['tag1', 'tag2'],
        tagsRegex: 'tag.*',
        sortBy: 'importance',
        sortOrder: 'desc',
        limit: 5
      });
    });

    it('should build search options with only some parameters', async () => {
      const mockMemories = [createMockMemory('mem_1', 'Test', 0.5, ['test'])];
      (memoryRepository.search as Mock).mockResolvedValue(mockMemories);

      const parameters = {
        content: 'test content',
        limit: 3
      };

      await memoryHandler.executeMemoryFunction('memory_search', parameters);

      expect(memoryRepository.search).toHaveBeenCalledWith({
        content: 'test content',
        limit: 3
      });
    });
  });

  describe('formatMemoryItem', () => {
    it('should format memory item correctly', async () => {
      const mockMemory = createMockMemory('mem_123', 'Test memory', 0.8, ['test', 'format']);
      (memoryRepository.recall as Mock).mockResolvedValue(mockMemory);

      const result = await memoryHandler.executeMemoryFunction('memory_recall', { id: 'mem_123' });

      expect(result).toEqual({
        success: true,
        memory: {
          id: 'mem_123',
          sentence: 'Test memory',
          importance: 0.8,
          tags: ['test', 'format']
        },
        found: true
      });
    });
  });
});
