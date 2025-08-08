import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import { MemoryForgetTool } from '../../src/internal-tools/memory/memory-forget-tool.js';

describe('MemoryForgetTool', () => {
  let mockMemoryRepository: MemoryRepository;
  let tool: MemoryForgetTool;

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

    tool = new MemoryForgetTool(mockMemoryRepository);
  });

  describe('toolName', () => {
    it('should return agentmemory_forget', () => {
      expect(tool.toolName).toBe('agentmemory_forget');
    });
  });

  describe('canHandle', () => {
    it('should return true for agentmemory_forget function (matches toolName)', () => {
      expect(tool.canHandle('agentmemory_forget')).toBe(true);
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
          name: 'agentmemory_forget',
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
      });
    });
  });

  describe('execute', () => {
    it('should successfully forget a memory', async () => {
      (mockMemoryRepository.forget as any).mockResolvedValue(true);

      const result = await tool.execute({
        id: 'mem-123'
      });

      expect(mockMemoryRepository.forget).toHaveBeenCalledWith('mem-123');
      expect(result).toEqual({
        success: true,
        message: 'Memory deleted successfully',
        deletedId: 'mem-123'
      });
    });

    it('should handle memory not found', async () => {
      (mockMemoryRepository.forget as any).mockResolvedValue(false);

      const result = await tool.execute({
        id: 'nonexistent-id'
      });

      expect(mockMemoryRepository.forget).toHaveBeenCalledWith('nonexistent-id');
      expect(result).toEqual({
        success: false,
        message: 'Memory not found',
        deletedId: 'nonexistent-id'
      });
    });

    it('should handle repository errors', async () => {
      (mockMemoryRepository.forget as any).mockRejectedValue(new Error('Delete failed'));

      const result = await tool.execute({
        id: 'mem-123'
      });

      expect(result).toEqual({
        success: false,
        error: 'Delete failed'
      });
    });

    it('should handle missing id parameter', async () => {
      const result = await tool.execute({});

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('id')
      });
    });

    it('should handle unknown errors', async () => {
       
      (mockMemoryRepository.forget as any).mockRejectedValue('String error');

      const result = await tool.execute({
        id: 'mem-123'
      });

      expect(result).toEqual({
        success: false,
        error: 'Unknown error occurred'
      });
    });
  });
});
