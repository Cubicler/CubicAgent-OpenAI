import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import { MemoryGetShortTermTool } from '../../src/internal-tools/memory/memory-get-short-term-tool.js';

describe('MemoryGetShortTermTool', () => {
  let mockMemoryRepository: MemoryRepository;
  let tool: MemoryGetShortTermTool;

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

    tool = new MemoryGetShortTermTool(mockMemoryRepository);
  });

  describe('toolName', () => {
    it('should return agentmemory_get_short_term', () => {
      expect(tool.toolName).toBe('agentmemory_get_short_term');
    });
  });

  describe('canHandle', () => {
    it('should return true for agentmemory_get_short_term function (matches toolName)', () => {
      expect(tool.canHandle('agentmemory_get_short_term')).toBe(true);
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
          name: 'agentmemory_get_short_term',
          description: 'Get short-term memories for prompt inclusion (within token capacity)',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      });
    });
  });

  describe('execute', () => {
    it('should successfully get short-term memories', async () => {
      const mockMemories = [
        { id: 'mem-1', content: 'Short-term memory 1', importance: 5 },
        { id: 'mem-2', content: 'Short-term memory 2', importance: 7 }
      ];
      (mockMemoryRepository.getShortTermMemories as any).mockReturnValue(mockMemories);

      const result = await tool.execute({});

      expect(mockMemoryRepository.getShortTermMemories).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        memories: mockMemories,
        count: 2
      });
    });

    it('should handle empty short-term memories', async () => {
      (mockMemoryRepository.getShortTermMemories as any).mockReturnValue([]);

      const result = await tool.execute({});

      expect(result).toEqual({
        success: true,
        memories: [],
        count: 0
      });
    });

    it('should handle repository errors', async () => {
      (mockMemoryRepository.getShortTermMemories as any).mockImplementation(() => {
        throw new Error('Failed to get short-term memories');
      });

      const result = await tool.execute({});

      expect(result).toEqual({
        success: false,
        error: 'Failed to get short-term memories'
      });
    });

    it('should handle unknown errors', async () => {
      (mockMemoryRepository.getShortTermMemories as any).mockImplementation(() => {
         
        throw 'String error';
      });

      const result = await tool.execute({});

      expect(result).toEqual({
        success: false,
        error: 'Unknown error occurred'
      });
    });

    it('should format memory items with default values', async () => {
      const mockMemories = [
        { memoryId: 'mem-1', sentence: 'Test memory', tags: ['tag1', 'tag2'] },
        { id: 'mem-2', content: 'Another memory' } // Missing optional fields
      ];
      (mockMemoryRepository.getShortTermMemories as any).mockReturnValue(mockMemories);

      const result = await tool.execute({});

      expect(result.success).toBe(true);
      expect(result.memories).toEqual(mockMemories);
    });
  });
});
