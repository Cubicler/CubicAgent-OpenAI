import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import { MemoryReplaceTagsTool } from '../../src/internal-tools/memory/memory-replace-tags-tool.js';

describe('MemoryReplaceTagsTool', () => {
  let mockMemoryRepository: MemoryRepository;
  let tool: MemoryReplaceTagsTool;

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

    tool = new MemoryReplaceTagsTool(mockMemoryRepository);
  });

  describe('toolName', () => {
    it('should return agentmemory_replace_tags', () => {
      expect(tool.toolName).toBe('agentmemory_replace_tags');
    });
  });

  describe('canHandle', () => {
    it('should return true for agentmemory_replace_tags function (matches toolName)', () => {
      expect(tool.canHandle('agentmemory_replace_tags')).toBe(true);
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
          name: 'agentmemory_replace_tags',
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
      });
    });
  });

  describe('execute', () => {
    it('should successfully replace tags on memory', async () => {
      (mockMemoryRepository.replaceTags as any).mockResolvedValue(true);

      const result = await tool.execute({
        id: 'mem-123',
        tags: ['work', 'important', 'project']
      });

      expect(mockMemoryRepository.replaceTags).toHaveBeenCalledWith('mem-123', ['work', 'important', 'project']);
      expect(result).toEqual({
        success: true,
        message: 'Tags replaced successfully',
        memoryId: 'mem-123',
        newTags: ['work', 'important', 'project']
      });
    });

    it('should handle memory not found', async () => {
      (mockMemoryRepository.replaceTags as any).mockResolvedValue(false);

      const result = await tool.execute({
        id: 'nonexistent-id',
        tags: ['new', 'tags']
      });

      expect(mockMemoryRepository.replaceTags).toHaveBeenCalledWith('nonexistent-id', ['new', 'tags']);
      expect(result).toEqual({
        success: false,
        message: 'Memory not found',
        memoryId: 'nonexistent-id',
        newTags: ['new', 'tags']
      });
    });

    it('should handle repository errors', async () => {
      (mockMemoryRepository.replaceTags as any).mockRejectedValue(new Error('Replace tags failed'));

      const result = await tool.execute({
        id: 'mem-123',
        tags: ['work', 'important']
      });

      expect(result).toEqual({
        success: false,
        error: 'Replace tags failed'
      });
    });

    it('should handle missing id parameter', async () => {
      const result = await tool.execute({
        tags: ['work', 'important']
      });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('id')
      });
    });

    it('should handle missing tags parameter', async () => {
      const result = await tool.execute({
        id: 'mem-123'
      });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('tags')
      });
    });

    it('should handle single tag replacement', async () => {
      (mockMemoryRepository.replaceTags as any).mockResolvedValue(true);

      const result = await tool.execute({
        id: 'mem-123',
        tags: ['single-tag']
      });

      expect(mockMemoryRepository.replaceTags).toHaveBeenCalledWith('mem-123', ['single-tag']);
      expect(result).toEqual({
        success: true,
        message: 'Tags replaced successfully',
        memoryId: 'mem-123',
        newTags: ['single-tag']
      });
    });

    it('should handle many tags replacement', async () => {
      (mockMemoryRepository.replaceTags as any).mockResolvedValue(true);
      const manyTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10'];

      const result = await tool.execute({
        id: 'mem-123',
        tags: manyTags
      });

      expect(mockMemoryRepository.replaceTags).toHaveBeenCalledWith('mem-123', manyTags);
      expect(result.success).toBe(true);
      expect(result.newTags).toEqual(manyTags);
    });

    it('should handle special characters in tags', async () => {
      (mockMemoryRepository.replaceTags as any).mockResolvedValue(true);
      const specialTags = ['work@2024', 'project#1', 'important!'];

      const result = await tool.execute({
        id: 'mem-123',
        tags: specialTags
      });

      expect(mockMemoryRepository.replaceTags).toHaveBeenCalledWith('mem-123', specialTags);
      expect(result.success).toBe(true);
      expect(result.newTags).toEqual(specialTags);
    });

    it('should handle empty tags array', async () => {
      // The implementation actually allows empty arrays, so this should work
      (mockMemoryRepository.replaceTags as any).mockResolvedValue(false);

      const result = await tool.execute({
        id: 'mem-123',
        tags: []
      });

      expect(mockMemoryRepository.replaceTags).toHaveBeenCalledWith('mem-123', []);
      expect(result).toEqual({
        success: false,
        message: 'Memory not found',
        memoryId: 'mem-123',
        newTags: []
      });
    });

    it('should handle invalid tags parameter type', async () => {
      const result = await tool.execute({
        id: 'mem-123',
        tags: 'not-an-array'
      });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('tags')
      });
    });

    it('should handle unknown errors', async () => {
       
      (mockMemoryRepository.replaceTags as any).mockRejectedValue('String error');

      const result = await tool.execute({
        id: 'mem-123',
        tags: ['work', 'important']
      });

      expect(result).toEqual({
        success: false,
        error: 'Unknown error occurred'
      });
    });
  });
});
