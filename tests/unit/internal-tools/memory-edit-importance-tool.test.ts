import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import { MemoryEditImportanceTool } from '../../../src/internal-tools/memory/memory-edit-importance-tool.js';

describe('MemoryEditImportanceTool', () => {
  let mockMemoryRepository: MemoryRepository;
  let tool: MemoryEditImportanceTool;

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

    tool = new MemoryEditImportanceTool(mockMemoryRepository);
  });

  describe('toolName', () => {
    it('should return agentmemory_edit_importance', () => {
      expect(tool.toolName).toBe('agentmemory_edit_importance');
    });
  });

  describe('canHandle', () => {
    it('should return true for agentmemory_edit_importance function (matches toolName)', () => {
      expect(tool.canHandle('agentmemory_edit_importance')).toBe(true);
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
          name: 'agentmemory_edit_importance',
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
      });
    });
  });

  describe('execute', () => {
    it('should successfully edit memory importance', async () => {
      (mockMemoryRepository.editImportance as any).mockResolvedValue(true);

      const result = await tool.execute({
        id: 'mem-123',
        importance: 0.8
      });

      expect(mockMemoryRepository.editImportance).toHaveBeenCalledWith('mem-123', 0.8);
      expect(result).toEqual({
        success: true,
        message: 'Importance updated successfully',
        memoryId: 'mem-123',
        newImportance: 0.8
      });
    });

    it('should handle memory not found', async () => {
      (mockMemoryRepository.editImportance as any).mockResolvedValue(false);

      const result = await tool.execute({
        id: 'nonexistent-id',
        importance: 0.5
      });

      expect(mockMemoryRepository.editImportance).toHaveBeenCalledWith('nonexistent-id', 0.5);
      expect(result).toEqual({
        success: false,
        message: 'Memory not found',
        memoryId: 'nonexistent-id',
        newImportance: 0.5
      });
    });

    it('should handle repository errors', async () => {
      (mockMemoryRepository.editImportance as any).mockRejectedValue(new Error('Edit failed'));

      const result = await tool.execute({
        id: 'mem-123',
        importance: 0.7
      });

      expect(result).toEqual({
        success: false,
        error: 'Edit failed'
      });
    });

    it('should handle missing id parameter', async () => {
      const result = await tool.execute({
        importance: 0.8
      });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('id')
      });
    });

    it('should handle missing importance parameter', async () => {
      const result = await tool.execute({
        id: 'mem-123'
      });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('importance')
      });
    });

    it('should handle invalid importance values', async () => {
      const result = await tool.execute({
        id: 'mem-123',
        importance: 'invalid'
      });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('importance')
      });
    });

    it('should handle boundary importance values', async () => {
      (mockMemoryRepository.editImportance as any).mockResolvedValue(true);

      // Test minimum value
      let result = await tool.execute({
        id: 'mem-123',
        importance: 0
      });
      expect(result.success).toBe(true);
      expect(result.newImportance).toBe(0);

      // Test maximum value
      result = await tool.execute({
        id: 'mem-123',
        importance: 1
      });
      expect(result.success).toBe(true);
      expect(result.newImportance).toBe(1);
    });

    it('should handle unknown errors', async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- Testing non-Error throws
      (mockMemoryRepository.editImportance as any).mockRejectedValue('String error');

      const result = await tool.execute({
        id: 'mem-123',
        importance: 0.5
      });

      expect(result).toEqual({
        success: false,
        error: 'Unknown error occurred'
      });
    });
  });
});
