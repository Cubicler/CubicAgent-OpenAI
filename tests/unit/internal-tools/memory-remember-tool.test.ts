import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import { MemoryRememberTool } from '../../../src/internal-tools/memory/memory-remember-tool.js';

describe('MemoryRememberTool', () => {
  let mockMemoryRepository: MemoryRepository;
  let tool: MemoryRememberTool;

  beforeEach(() => {
    // Create mock memory repository
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

    tool = new MemoryRememberTool(mockMemoryRepository);
  });

  describe('toolName', () => {
    it('should return agentmemory_remember', () => {
      expect(tool.toolName).toBe('agentmemory_remember');
    });
  });

  describe('canHandle', () => {
    it('should return true for agentmemory_remember function (matches toolName)', () => {
      expect(tool.canHandle('agentmemory_remember')).toBe(true);
    });

    it('should return false for other functions', () => {
      expect(tool.canHandle('agentmemory_recall')).toBe(false);
      expect(tool.canHandle('unknown_function')).toBe(false);
    });

    it('should use toolName for consistency across all memory tools', () => {
      // This tests your intended design - canHandle is based on toolName
      expect(tool.canHandle(tool.toolName)).toBe(true);
    });
  });

  describe('getToolDefinition', () => {
    it('should return proper OpenAI function definition', () => {
      const definition = tool.getToolDefinition();
      
      expect(definition).toEqual({
        type: 'function',
        function: {
          name: 'agentmemory_remember',
          description: 'Store a new memory with optional importance and tags',
          parameters: {
            type: 'object',
            properties: {
              sentence: {
                type: 'string',
                description: 'The memory content to store'
              },
              importance: {
                type: 'number',
                description: 'Importance level (1-10, default: 5)',
                minimum: 1,
                maximum: 10
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags for categorizing the memory (mandatory, cannot be empty)'
              }
            },
            required: ['sentence', 'tags']
          }
        }
      });
    });
  });

  describe('execute', () => {
    it('should successfully remember information with minimum parameters', async () => {
      const mockResult = 'mem-123';
      (mockMemoryRepository.remember as any).mockResolvedValue(mockResult);

      const result = await tool.execute({
        sentence: 'Important information to remember',
        tags: ['general']
      });

      expect(mockMemoryRepository.remember).toHaveBeenCalledWith(
        'Important information to remember',
        undefined,
        ['general']
      );
      expect(result).toEqual({
        success: true,
        message: 'Memory stored successfully',
        memoryId: mockResult,
        sentence: 'Important information to remember'
      });
    });

    it('should successfully remember information with all parameters', async () => {
      const mockResult = 'mem-123';
      (mockMemoryRepository.remember as any).mockResolvedValue(mockResult);

      const result = await tool.execute({
        sentence: 'Critical system information',
        importance: 8,
        tags: ['system', 'critical']
      });

      expect(mockMemoryRepository.remember).toHaveBeenCalledWith(
        'Critical system information',
        8,
        ['system', 'critical']
      );
      expect(result).toEqual({
        success: true,
        message: 'Memory stored successfully',
        memoryId: mockResult,
        sentence: 'Critical system information'
      });
    });

    it('should handle memory repository errors', async () => {
      const error = new Error('Memory storage failed');
      (mockMemoryRepository.remember as any).mockRejectedValue(error);

      const result = await tool.execute({
        sentence: 'Information to remember',
        tags: ['test']
      });

      expect(result).toEqual({
        success: false,
        error: 'Memory storage failed'
      });
    });

    it('should handle invalid parameters gracefully', async () => {
      const result = await tool.execute({
        // Missing required sentence parameter
        importance: 5
      });

      expect(result).toEqual({
        success: false,
        error: 'Parameter sentence must be a string'
      });
    });

    it('should handle non-Error exceptions', async () => {
      (mockMemoryRepository.remember as any).mockRejectedValue('String error');

      const result = await tool.execute({
        sentence: 'Information to remember',
        tags: ['test']
      });

      expect(result).toEqual({
        success: false,
        error: 'Unknown error occurred'
      });
    });
  });
});
