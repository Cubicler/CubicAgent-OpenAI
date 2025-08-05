import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import { MemoryAddToShortTermTool } from '../../../src/internal-tools/memory/memory-add-to-short-term-tool.js';

describe('MemoryAddToShortTermTool', () => {
  let mockMemoryRepository: MemoryRepository;
  let tool: MemoryAddToShortTermTool;

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

    tool = new MemoryAddToShortTermTool(mockMemoryRepository);
  });

  describe('toolName', () => {
    it('should return agentmemory_add_to_short_term', () => {
      expect(tool.toolName).toBe('agentmemory_add_to_short_term');
    });
  });

  describe('canHandle', () => {
    it('should return true for agentmemory_add_to_short_term function (matches toolName)', () => {
      expect(tool.canHandle('agentmemory_add_to_short_term')).toBe(true);
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
          name: 'agentmemory_add_to_short_term',
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
      });
    });
  });

  describe('execute', () => {
    it('should successfully add memory to short-term storage', async () => {
      (mockMemoryRepository.addToShortTermMemory as any).mockResolvedValue(true);

      const result = await tool.execute({
        id: 'mem-123'
      });

      expect(mockMemoryRepository.addToShortTermMemory).toHaveBeenCalledWith('mem-123');
      expect(result).toEqual({
        success: true,
        message: 'Memory added to short-term storage',
        memoryId: 'mem-123'
      });
    });

    it('should handle memory not found or already in short-term', async () => {
      (mockMemoryRepository.addToShortTermMemory as any).mockResolvedValue(false);

      const result = await tool.execute({
        id: 'mem-123'
      });

      expect(mockMemoryRepository.addToShortTermMemory).toHaveBeenCalledWith('mem-123');
      expect(result).toEqual({
        success: false,
        message: 'Memory not found or already in short-term',
        memoryId: 'mem-123'
      });
    });

    it('should handle repository errors', async () => {
      (mockMemoryRepository.addToShortTermMemory as any).mockRejectedValue(new Error('Add failed'));

      const result = await tool.execute({
        id: 'mem-123'
      });

      expect(result).toEqual({
        success: false,
        error: 'Add failed'
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
       
      (mockMemoryRepository.addToShortTermMemory as any).mockRejectedValue('String error');

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
