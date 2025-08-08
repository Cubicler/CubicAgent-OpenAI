import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import { MemoryRecallTool } from '../../src/internal-tools/memory/memory-recall-tool.js';

describe('MemoryRecallTool', () => {
  let mockMemoryRepository: MemoryRepository;
  let tool: MemoryRecallTool;

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

    tool = new MemoryRecallTool(mockMemoryRepository);
  });

  describe('toolName', () => {
    it('should return agentmemory_recall', () => {
      expect(tool.toolName).toBe('agentmemory_recall');
    });
  });

  describe('canHandle', () => {
    it('should return true for agentmemory_recall function (matches toolName)', () => {
      expect(tool.canHandle('agentmemory_recall')).toBe(true);
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
          name: 'agentmemory_recall',
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
      });
    });
  });

  describe('execute', () => {
    it('should successfully recall memory by ID', async () => {
      const mockMemory = {
        id: 'mem-123',
        sentence: 'Recalled information',
        importance: 8,
        tags: [],
        createdAt: '2025-08-03T09:37:26.645Z',
        updatedAt: '2025-08-03T09:37:26.645Z'
      };
      (mockMemoryRepository.recall as any).mockResolvedValue(mockMemory);

      const result = await tool.execute({ id: 'mem-123' });

      expect(mockMemoryRepository.recall).toHaveBeenCalledWith('mem-123');
      expect(result).toEqual({
        success: true,
        memory: mockMemory,
        found: true
      });
    });

    it('should handle memory not found', async () => {
      (mockMemoryRepository.recall as any).mockResolvedValue(null);

      const result = await tool.execute({
        id: 'nonexistent-id'
      });

      expect(mockMemoryRepository.recall).toHaveBeenCalledWith('nonexistent-id');
      expect(result).toEqual({
        success: true,
        memory: null,
        found: false
      });
    });

    it('should handle memory repository errors', async () => {
      const error = new Error('Memory retrieval failed');
      (mockMemoryRepository.recall as any).mockRejectedValue(error);

      const result = await tool.execute({
        id: 'mem-123'
      });

      expect(result).toEqual({
        success: false,
        error: 'Memory retrieval failed'
      });
    });

    it('should handle missing id parameter', async () => {
      const result = await tool.execute({});

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('id')
      });
    });

    it('should handle memory repository errors', async () => {
      const error = new Error('Memory retrieval failed');
      (mockMemoryRepository.recall as any).mockRejectedValue(error);

      const result = await tool.execute({
        id: 'mem-123'
      });

      expect(result).toEqual({
        success: false,
        error: 'Memory retrieval failed'
      });
    });

    it('should handle empty parameters gracefully', async () => {
      const result = await tool.execute({});

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('id')
      });
    });
  });
});
