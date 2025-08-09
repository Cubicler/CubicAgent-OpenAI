import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { Logger } from '../../src/utils/logger.interface.js';
import { MemoryAddTagTool } from '../../src/internal-tools/memory/memory-add-tag-tool.js';

describe('MemoryAddTagTool', () => {
  let mockMemoryRepository: MemoryRepository;
  let mockLogger: Logger;
  let tool: MemoryAddTagTool;

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

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as Logger;

    tool = new MemoryAddTagTool(mockMemoryRepository, mockLogger);
  });

  describe('toolName', () => {
    it('should return agentmemory_add_tag', () => {
      expect(tool.toolName).toBe('agentmemory_add_tag');
    });
  });

  describe('canHandle', () => {
    it('should return true for agentmemory_add_tag function (matches toolName)', () => {
      expect(tool.canHandle('agentmemory_add_tag')).toBe(true);
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
          name: 'agentmemory_add_tag',
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
      });
    });
  });

  describe('execute', () => {
    it('should successfully add tag to memory', async () => {
      (mockMemoryRepository.addTag as any).mockResolvedValue(true);

      const result = await tool.execute({
        id: 'mem-123',
        tag: 'important'
      });

      expect(mockMemoryRepository.addTag).toHaveBeenCalledWith('mem-123', 'important');
      expect(result).toEqual({
        success: true,
        message: 'Tag added successfully',
        memoryId: 'mem-123',
        tag: 'important'
      });
    });

    it('should handle memory not found or tag already exists', async () => {
      (mockMemoryRepository.addTag as any).mockResolvedValue(false);

      const result = await tool.execute({
        id: 'nonexistent-id',
        tag: 'work'
      });

      expect(mockMemoryRepository.addTag).toHaveBeenCalledWith('nonexistent-id', 'work');
      expect(result).toEqual({
        success: false,
        message: 'Memory not found or tag already exists',
        memoryId: 'nonexistent-id',
        tag: 'work'
      });
    });

    it('should handle repository errors', async () => {
      (mockMemoryRepository.addTag as any).mockRejectedValue(new Error('Add tag failed'));

      const result = await tool.execute({
        id: 'mem-123',
        tag: 'important'
      });

      expect(result).toEqual({
        success: false,
        error: 'Add tag failed'
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

    it('should handle empty tag', async () => {
      (mockMemoryRepository.addTag as any).mockResolvedValue(true);

      const result = await tool.execute({
        id: 'mem-123',
        tag: ''
      });

      expect(mockMemoryRepository.addTag).toHaveBeenCalledWith('mem-123', '');
      expect(result).toEqual({
        success: true,
        message: 'Tag added successfully',
        memoryId: 'mem-123',
        tag: ''
      });
    });

    it('should handle special characters in tags', async () => {
      (mockMemoryRepository.addTag as any).mockResolvedValue(true);
      const specialTag = 'work@2024#important!';

      const result = await tool.execute({
        id: 'mem-123',
        tag: specialTag
      });

      expect(mockMemoryRepository.addTag).toHaveBeenCalledWith('mem-123', specialTag);
      expect(result.success).toBe(true);
      expect(result.tag).toBe(specialTag);
    });

    it('should handle unknown errors', async () => {
       
      (mockMemoryRepository.addTag as any).mockRejectedValue('String error');

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
