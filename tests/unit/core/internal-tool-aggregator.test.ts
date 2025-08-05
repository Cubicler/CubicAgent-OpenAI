import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InternalToolAggregator } from '../../../src/core/internal-tool-aggregator.js';
import type { InternalTool, InternalToolResult } from '../../../src/internal-tools/internal-tool.interface.js';
import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../../../src/config/types.js';

// Mock tool implementations for testing
class MockMemoryTool implements InternalTool {
  readonly toolName = 'agentmemory_remember';

  canHandle(functionName: string): boolean {
    return functionName === 'agentmemory_remember';
  }

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: 'agentmemory_remember',
        description: 'Remember information for later use',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Content to remember' },
            importance: { type: 'number', description: 'Importance level (1-10)' }
          },
          required: ['content']
        }
      }
    };
  }

  async execute(parameters: JSONValue): Promise<InternalToolResult> {
    const params = parameters as { content: string; importance?: number };
    return {
      success: true,
      data: { 
        message: `Remembered: ${params.content}`,
        id: 'memory-123',
        importance: params.importance || 5
      },
      functionName: 'agentmemory_remember'
    };
  }
}

class MockSearchTool implements InternalTool {
  readonly toolName = 'agentmemory_search';

  canHandle(functionName: string): boolean {
    return functionName === 'agentmemory_search';
  }

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: 'agentmemory_search',
        description: 'Search stored memories',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        }
      }
    };
  }

  async execute(parameters: JSONValue): Promise<InternalToolResult> {
    const params = parameters as { query: string };
    return {
      success: true,
      data: { 
        results: [`Found: ${params.query}`],
        count: 1
      },
      functionName: 'agentmemory_search'
    };
  }
}

class MockFailingTool implements InternalTool {
  readonly toolName = 'failing_tool';

  canHandle(functionName: string): boolean {
    return functionName === 'failing_tool';
  }

  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: 'failing_tool',
        description: 'A tool that always fails',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    };
  }

  async execute(_parameters: JSONValue): Promise<InternalToolResult> {
    throw new Error('This tool always fails');
  }
}

describe('InternalToolAggregator', () => {
  let aggregator: InternalToolAggregator;
  let memoryTool: MockMemoryTool;
  let searchTool: MockSearchTool;
  let failingTool: MockFailingTool;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    memoryTool = new MockMemoryTool();
    searchTool = new MockSearchTool();
    failingTool = new MockFailingTool();
    
    // Mock console.error to avoid noise in test output
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
  });

  describe('Constructor and Basic Setup', () => {
    it('should initialize with empty tools array', () => {
      aggregator = new InternalToolAggregator([]);
      
      expect(aggregator.getToolCount()).toBe(0);
      expect(aggregator.getSupportedFunctions()).toEqual([]);
      expect(aggregator.buildTools()).toEqual([]);
    });

    it('should initialize with provided tools', () => {
      aggregator = new InternalToolAggregator([memoryTool, searchTool]);
      
      expect(aggregator.getToolCount()).toBe(2);
      expect(aggregator.getSupportedFunctions()).toEqual(['agentmemory_remember', 'agentmemory_search']);
    });
  });

  describe('Tool Management', () => {
    beforeEach(() => {
      aggregator = new InternalToolAggregator([memoryTool]);
    });

    it('should add new tools dynamically', () => {
      expect(aggregator.getToolCount()).toBe(1);
      
      aggregator.addTool(searchTool);
      
      expect(aggregator.getToolCount()).toBe(2);
      expect(aggregator.getSupportedFunctions()).toContain('agentmemory_search');
    });

    it('should remove tools by name', () => {
      aggregator.addTool(searchTool);
      expect(aggregator.getToolCount()).toBe(2);
      
      const removed = aggregator.removeTool('agentmemory_search');
      
      expect(removed).toBe(true);
      expect(aggregator.getToolCount()).toBe(1);
      expect(aggregator.getSupportedFunctions()).not.toContain('agentmemory_search');
    });

    it('should return false when removing non-existent tool', () => {
      const removed = aggregator.removeTool('non_existent_tool');
      
      expect(removed).toBe(false);
      expect(aggregator.getToolCount()).toBe(1);
    });

    it('should get specific tool by name', () => {
      const tool = aggregator.getTool('agentmemory_remember');
      
      expect(tool).toBe(memoryTool);
    });

    it('should return undefined for non-existent tool', () => {
      const tool = aggregator.getTool('non_existent_tool');
      
      expect(tool).toBeUndefined();
    });
  });

  describe('Tool Definition Building', () => {
    beforeEach(() => {
      aggregator = new InternalToolAggregator([memoryTool, searchTool]);
    });

    it('should build tool definitions from all tools', () => {
      const definitions = aggregator.buildTools();
      
      expect(definitions).toHaveLength(2);
      expect(definitions[0]).toEqual({
        type: 'function',
        function: {
          name: 'agentmemory_remember',
          description: 'Remember information for later use',
          parameters: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Content to remember' },
              importance: { type: 'number', description: 'Importance level (1-10)' }
            },
            required: ['content']
          }
        }
      });
    });

    it('should build correct tool definitions for search tool', () => {
      const definitions = aggregator.buildTools();
      const searchDefinition = definitions.find(def => def.function.name === 'agentmemory_search');
      
      expect(searchDefinition).toBeDefined();
      expect(searchDefinition?.function.description).toBe('Search stored memories');
    });
  });

  describe('Function Handling', () => {
    beforeEach(() => {
      aggregator = new InternalToolAggregator([memoryTool, searchTool]);
    });

    it('should correctly identify handleable functions', () => {
      expect(aggregator.canHandle('agentmemory_remember')).toBe(true);
      expect(aggregator.canHandle('agentmemory_search')).toBe(true);
      expect(aggregator.canHandle('unknown_function')).toBe(false);
    });

    it('should execute function using correct tool', async () => {
      const result = await aggregator.executeFunction('agentmemory_remember', {
        content: 'Test memory',
        importance: 8
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        message: 'Remembered: Test memory',
        id: 'memory-123',
        importance: 8
      });
      expect(result.functionName).toBe('agentmemory_remember');
    });

    it('should execute search function correctly', async () => {
      const result = await aggregator.executeFunction('agentmemory_search', {
        query: 'test query'
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        results: ['Found: test query'],
        count: 1
      });
    });

    it('should return error for unknown function', async () => {
      const result = await aggregator.executeFunction('unknown_function', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No tool found for function: unknown_function');
      expect(result.functionName).toBe('unknown_function');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      aggregator = new InternalToolAggregator([memoryTool, failingTool]);
    });

    it('should handle tool execution errors gracefully', async () => {
      const result = await aggregator.executeFunction('failing_tool', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('This tool always fails');
      expect(result.functionName).toBe('failing_tool');
      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ Tool execution failed for failing_tool:',
        expect.any(Error)
      );
    });

    it('should handle unknown error types', async () => {
      // Create a tool that throws something other than Error
      const strangeFailingTool: InternalTool = {
        toolName: 'strange_failing_tool',
        canHandle: (fn) => fn === 'strange_failing_tool',
        getToolDefinition: () => ({
          type: 'function',
          function: { name: 'strange_failing_tool', description: 'Strange tool', parameters: {} }
        }),
        execute: async () => {
           
          throw 'Strange error type';
        }
      };

      aggregator.addTool(strangeFailingTool);
      
      const result = await aggregator.executeFunction('strange_failing_tool', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
      expect(result.functionName).toBe('strange_failing_tool');
    });
  });

  describe('Edge Cases', () => {
    it('should handle tools with same function name (first one wins)', () => {
      const duplicateTool: InternalTool = {
        toolName: 'agentmemory_remember',
        canHandle: (fn) => fn === 'agentmemory_remember',
        getToolDefinition: () => memoryTool.getToolDefinition(),
        execute: async () => ({ success: true, data: 'duplicate', functionName: 'agentmemory_remember' })
      };
      
      aggregator = new InternalToolAggregator([memoryTool, duplicateTool]);
      
      expect(aggregator.canHandle('agentmemory_remember')).toBe(true);
      expect(aggregator.getToolCount()).toBe(2);
    });

    it('should handle empty parameters correctly', async () => {
      aggregator = new InternalToolAggregator([memoryTool]);
      
      const result = await aggregator.executeFunction('agentmemory_remember', {
        content: 'Test with minimal params'
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        message: 'Remembered: Test with minimal params',
        id: 'memory-123',
        importance: 5 // default value
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of tools efficiently', () => {
      const manyTools: InternalTool[] = Array.from({ length: 100 }, (_, i) => ({
        toolName: `tool_${i}`,
        canHandle: (fn) => fn === `tool_${i}`,
        getToolDefinition: () => ({
          type: 'function',
          function: { name: `tool_${i}`, description: `Tool ${i}`, parameters: {} }
        }),
        execute: async () => ({ success: true, data: i, functionName: `tool_${i}` })
      }));
      
      aggregator = new InternalToolAggregator(manyTools);
      
      expect(aggregator.getToolCount()).toBe(100);
      expect(aggregator.getSupportedFunctions()).toHaveLength(100);
      expect(aggregator.canHandle('tool_50')).toBe(true);
      expect(aggregator.canHandle('tool_999')).toBe(false);
    });

    it('should build tool definitions efficiently for many tools', () => {
      const manyTools: InternalTool[] = Array.from({ length: 50 }, (_, i) => ({
        toolName: `tool_${i}`,
        canHandle: (fn) => fn === `tool_${i}`,
        getToolDefinition: () => ({
          type: 'function',
          function: { name: `tool_${i}`, description: `Tool ${i}`, parameters: {} }
        }),
        execute: async () => ({ success: true, data: i, functionName: `tool_${i}` })
      }));
      
      aggregator = new InternalToolAggregator(manyTools);
      
      const startTime = performance.now();
      const definitions = aggregator.buildTools();
      const endTime = performance.now();
      
      expect(definitions).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
    });
  });
});
