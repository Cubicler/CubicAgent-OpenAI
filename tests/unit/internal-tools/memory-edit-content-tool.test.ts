import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import { MemoryEditContentTool } from '../../../src/internal-tools/memory/memory-edit-content-tool.js';

describe('MemoryEditContentTool', () => {
  let mockMemoryRepository: MemoryRepository;
  let tool: MemoryEditContentTool;

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

    tool = new MemoryEditContentTool(mockMemoryRepository);
  });

  describe('toolName', () => {
    it('should return agentmemory_edit_content', () => {
      expect(tool.toolName).toBe('agentmemory_edit_content');
    });
  });

  describe('canHandle', () => {
    it('should return true for agentmemory_edit_content function (matches toolName)', () => {
      expect(tool.canHandle('agentmemory_edit_content')).toBe(true);
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
          name: 'agentmemory_edit_content',
          description: 'Edit the content/sentence of an existing memory',
          parameters: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Memory ID to edit'
              },
              sentence: {
                type: 'string',
                description: 'New memory sentence'
              }
            },
            required: ['id', 'sentence']
          }
        }
      });
    });
  });

  describe('execute', () => {
    it('should successfully edit memory content', async () => {
      (mockMemoryRepository.editContent as any).mockResolvedValue(true);

      const result = await tool.execute({
        id: 'mem-123',
        sentence: 'Updated memory content'
      });

      expect(mockMemoryRepository.editContent).toHaveBeenCalledWith('mem-123', 'Updated memory content');
      expect(result).toEqual({
        success: true,
        message: 'Content updated successfully',
        memoryId: 'mem-123',
        newSentence: 'Updated memory content'
      });
    });

    it('should handle memory not found', async () => {
      (mockMemoryRepository.editContent as any).mockResolvedValue(false);

      const result = await tool.execute({
        id: 'nonexistent-id',
        sentence: 'New content'
      });

      expect(mockMemoryRepository.editContent).toHaveBeenCalledWith('nonexistent-id', 'New content');
      expect(result).toEqual({
        success: false,
        message: 'Memory not found',
        memoryId: 'nonexistent-id',
        newSentence: 'New content'
      });
    });

    it('should handle repository errors', async () => {
      (mockMemoryRepository.editContent as any).mockRejectedValue(new Error('Edit failed'));

      const result = await tool.execute({
        id: 'mem-123',
        sentence: 'New content'
      });

      expect(result).toEqual({
        success: false,
        error: 'Edit failed'
      });
    });

    it('should handle missing id parameter', async () => {
      const result = await tool.execute({
        sentence: 'New content'
      });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('id')
      });
    });

    it('should handle missing sentence parameter', async () => {
      const result = await tool.execute({
        id: 'mem-123'
      });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('sentence')
      });
    });

    it('should handle empty sentence', async () => {
      (mockMemoryRepository.editContent as any).mockResolvedValue(true);

      const result = await tool.execute({
        id: 'mem-123',
        sentence: ''
      });

      expect(mockMemoryRepository.editContent).toHaveBeenCalledWith('mem-123', '');
      expect(result).toEqual({
        success: true,
        message: 'Content updated successfully',
        memoryId: 'mem-123',
        newSentence: ''
      });
    });

    it('should handle long sentences', async () => {
      (mockMemoryRepository.editContent as any).mockResolvedValue(true);
      const longSentence = 'A'.repeat(1000);

      const result = await tool.execute({
        id: 'mem-123',
        sentence: longSentence
      });

      expect(mockMemoryRepository.editContent).toHaveBeenCalledWith('mem-123', longSentence);
      expect(result.success).toBe(true);
      expect(result.newSentence).toBe(longSentence);
    });

    it('should handle unknown errors', async () => {
       
      (mockMemoryRepository.editContent as any).mockRejectedValue('String error');

      const result = await tool.execute({
        id: 'mem-123',
        sentence: 'New content'
      });

      expect(result).toEqual({
        success: false,
        error: 'Unknown error occurred'
      });
    });
  });
});
