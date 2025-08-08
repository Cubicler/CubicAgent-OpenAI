import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import { MemorySearchTool } from '../../src/internal-tools/memory/memory-search-tool.js';

describe('MemorySearchTool', () => {
  let mockMemoryRepository: MemoryRepository;
  let tool: MemorySearchTool;

  beforeEach(() => {
    mockMemoryRepository = {
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
    } as MemoryRepository;

    tool = new MemorySearchTool(mockMemoryRepository);
  });

  describe('toolName', () => {
    it('should return agentmemory_search', () => {
      expect(tool.toolName).toBe('agentmemory_search');
    });
  });

  describe('canHandle', () => {
    it('should return true for agentmemory_search function (matches toolName)', () => {
      expect(tool.canHandle('agentmemory_search')).toBe(true);
    });

    it('should return false for other functions', () => {
      expect(tool.canHandle('agentmemory_remember')).toBe(false);
      expect(tool.canHandle('unknown_function')).toBe(false);
    });

    it('should use toolName for consistency across all memory tools', () => {
      expect(tool.canHandle(tool.toolName)).toBe(true);
    });
  });

  describe('getToolDefinition', () => {
    it('should return proper OpenAI function definition', () => {
      const definition = tool.getToolDefinition();
      
      expect(definition).toEqual({
        type: 'function',
        function: {
          name: 'agentmemory_search',
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
      });
    });
  });

  describe('execute', () => {
    it('should successfully search memories with content parameter', async () => {
      const mockMemories = [
        { id: 'mem-1', content: 'Test memory 1', importance: 5, score: 0.9 },
        { id: 'mem-2', content: 'Test memory 2', importance: 7, score: 0.8 }
      ];
      (mockMemoryRepository.search as any).mockResolvedValue(mockMemories);

      const result = await tool.execute({
        content: 'test search'
      });

      expect(mockMemoryRepository.search).toHaveBeenCalledWith({
        content: 'test search',
        limit: 10
      });
      expect(result).toEqual({
        success: true,
        memories: [
          {
            id: 'mem-1',
            sentence: 'Test memory 1',
            importance: 5,
            tags: [],
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            score: 0.9
          },
          {
            id: 'mem-2',
            sentence: 'Test memory 2',
            importance: 7,
            tags: [],
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            score: 0.8
          }
        ],
        count: 2,
        searchOptions: {
          content: 'test search',
          limit: 10
        }
      });
    });

    it('should successfully search memories with all parameters', async () => {
      const mockMemories = [
        { id: 'mem-1', content: 'Tagged memory', importance: 8, tags: ['work', 'important'], score: 0.95 }
      ];
      (mockMemoryRepository.search as any).mockResolvedValue(mockMemories);

      const result = await tool.execute({
        content: 'work related',
        tags: ['work', 'important'],
        sortBy: 'importance',
        sortOrder: 'desc',
        limit: 5
      });

      expect(mockMemoryRepository.search).toHaveBeenCalledWith({
        content: 'work related',
        tags: ['work', 'important'],
        sortBy: 'importance',
        sortOrder: 'desc',
        limit: 5
      });
      expect(result).toEqual({
        success: true,
        memories: [
          {
            id: 'mem-1',
            sentence: 'Tagged memory',
            importance: 8,
            tags: ['work', 'important'],
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            score: 0.95
          }
        ],
        count: 1,
        searchOptions: {
          content: 'work related',
          tags: ['work', 'important'],
          sortBy: 'importance',
          sortOrder: 'desc',
          limit: 5
        }
      });
    });

    it('should search with contentRegex parameter', async () => {
      const mockMemories = [
        { id: 'mem-1', content: 'Regular expression match', importance: 6, score: 0.85 }
      ];
      (mockMemoryRepository.search as any).mockResolvedValue(mockMemories);

      const result = await tool.execute({
        contentRegex: '^Regular.*match$',
        limit: 3
      });

      expect(mockMemoryRepository.search).toHaveBeenCalledWith({
        contentRegex: '^Regular.*match$',
        limit: 3
      });
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });

    it('should search with tagsRegex parameter', async () => {
      const mockMemories = [];
      (mockMemoryRepository.search as any).mockResolvedValue(mockMemories);

      const result = await tool.execute({
        tagsRegex: 'work.*',
        sortBy: 'timestamp',
        sortOrder: 'asc'
      });

      expect(mockMemoryRepository.search).toHaveBeenCalledWith({
        tagsRegex: 'work.*',
        sortBy: 'timestamp',
        sortOrder: 'asc',
        limit: 10
      });
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });

    it('should handle search with no parameters (uses defaults)', async () => {
      const mockMemories = [];
      (mockMemoryRepository.search as any).mockResolvedValue(mockMemories);

      const result = await tool.execute({});

      expect(mockMemoryRepository.search).toHaveBeenCalledWith({
        limit: 10
      });
      expect(result).toEqual({
        success: true,
        memories: [],
        count: 0,
        searchOptions: {
          limit: 10
        }
      });
    });

    it('should handle empty search results', async () => {
      (mockMemoryRepository.search as any).mockResolvedValue([]);

      const result = await tool.execute({
        content: 'nonexistent'
      });

      expect(result).toEqual({
        success: true,
        memories: [],
        count: 0,
        searchOptions: {
          content: 'nonexistent',
          limit: 10
        }
      });
    });

    it('should handle null search results', async () => {
      (mockMemoryRepository.search as any).mockResolvedValue(null);

      const result = await tool.execute({
        content: 'test'
      });

      expect(result).toEqual({
        success: true,
        memories: [],
        count: 0,
        searchOptions: {
          content: 'test',
          limit: 10
        }
      });
    });

    it('should handle repository errors', async () => {
      (mockMemoryRepository.search as any).mockRejectedValue(new Error('Search failed'));

      const result = await tool.execute({
        content: 'test'
      });

      expect(result).toEqual({
        success: false,
        error: 'Search failed'
      });
    });

    it('should filter out undefined values from search options', async () => {
      const mockMemories = [];
      (mockMemoryRepository.search as any).mockResolvedValue(mockMemories);

      const result = await tool.execute({
        content: 'test',
        tags: ['work'],
        // contentRegex, tagsRegex, sortBy, sortOrder are undefined
        limit: 15
      });

      expect(mockMemoryRepository.search).toHaveBeenCalledWith({
        content: 'test',
        tags: ['work'],
        limit: 15
        // No undefined values should be passed
      });
      expect(result.success).toBe(true);
    });
  });
});
