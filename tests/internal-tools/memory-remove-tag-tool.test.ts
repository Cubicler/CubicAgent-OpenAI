import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import { MemoryRemoveTagTool } from '../../src/internal-tools/memory/memory-remove-tag-tool.js';

describe('MemoryRemoveTagTool', () => {
  let mockMemoryRepository: MemoryRepository;
  let tool: MemoryRemoveTagTool;

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

    tool = new MemoryRemoveTagTool(mockMemoryRepository);
  });

  describe('toolName', () => {
    it('should return agentmemory_remove_tag', () => {
      expect(tool.toolName).toBe('agentmemory_remove_tag');
    });
  });

  describe('canHandle', () => {
    it('should return true for agentmemory_remove_tag function (matches toolName)', () => {
      expect(tool.canHandle('agentmemory_remove_tag')).toBe(true);
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
          name: 'agentmemory_remove_tag',
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
      });
    });
  });

  describe('execute', () => {
    it('should successfully remove tag from memory', async () => {
      (mockMemoryRepository.removeTag as any).mockResolvedValue(true);

      const result = await tool.execute({
        id: 'mem-123',
        tag: 'obsolete'
      });

      expect(mockMemoryRepository.removeTag).toHaveBeenCalledWith('mem-123', 'obsolete');
      expect(result).toEqual({
        success: true,
        message: 'Tag removed successfully',
        memoryId: 'mem-123',
        tag: 'obsolete'
      });
    });

    it('should handle memory not found or tag does not exist', async () => {
      (mockMemoryRepository.removeTag as any).mockResolvedValue(false);

      const result = await tool.execute({
        id: 'nonexistent-id',
        tag: 'work'
      });

      expect(mockMemoryRepository.removeTag).toHaveBeenCalledWith('nonexistent-id', 'work');
      expect(result).toEqual({
        success: false,
        message: 'Memory not found or tag does not exist',
        memoryId: 'nonexistent-id',
        tag: 'work'
      });
    });

    it('should handle repository errors', async () => {
      (mockMemoryRepository.removeTag as any).mockRejectedValue(new Error('Remove tag failed'));

      const result = await tool.execute({
        id: 'mem-123',
        tag: 'important'
      });

      expect(result).toEqual({
        success: false,
        error: 'Remove tag failed'
      });
    });

    it('should handle missing id parameter', async () => {
      const result = await tool.execute({
        tag: 'important'
      });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('id')
      });
    });

    it('should handle missing tag parameter', async () => {
      const result = await tool.execute({
        id: 'mem-123'
      });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('tag')
      });
    });

    it('should handle empty tag removal', async () => {
      (mockMemoryRepository.removeTag as any).mockResolvedValue(true);

      const result = await tool.execute({
        id: 'mem-123',
        tag: ''
      });

      expect(mockMemoryRepository.removeTag).toHaveBeenCalledWith('mem-123', '');
      expect(result).toEqual({
        success: true,
        message: 'Tag removed successfully',
        memoryId: 'mem-123',
        tag: ''
      });
    });

    it('should handle special characters in tags', async () => {
      (mockMemoryRepository.removeTag as any).mockResolvedValue(true);
      const specialTag = 'work@2024#important!';

      const result = await tool.execute({
        id: 'mem-123',
        tag: specialTag
      });

      expect(mockMemoryRepository.removeTag).toHaveBeenCalledWith('mem-123', specialTag);
      expect(result.success).toBe(true);
      expect(result.tag).toBe(specialTag);
    });

    it('should handle constraints that prevent tag removal', async () => {
      (mockMemoryRepository.removeTag as any).mockRejectedValue(new Error('Cannot remove tag: would result in empty tags'));

      const result = await tool.execute({
        id: 'mem-123',
        tag: 'last-tag'
      });

      expect(result).toEqual({
        success: false,
        error: 'Cannot remove tag: would result in empty tags'
      });
    });

    it('should handle unknown errors', async () => {
       
      (mockMemoryRepository.removeTag as any).mockRejectedValue('String error');

      const result = await tool.execute({
        id: 'mem-123',
        tag: 'work'
      });

      expect(result).toEqual({
        success: false,
        error: 'Unknown error occurred'
      });
    });
  });
});
