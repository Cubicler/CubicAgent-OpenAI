import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentTool, AgentClient } from '@cubicler/cubicagentkit';
import { SummarizerToolInstance, createSummarizerTools } from '../../../src/internal-tools/summarizer/summarizer-tool.js';

// Mock OpenAI module
const mockCreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  };
});

describe('SummarizerToolInstance', () => {
  let mockAgentClient: AgentClient;
  let mockOriginalTool: AgentTool;
  let summarizerTool: SummarizerToolInstance;

  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();

    // Mock AgentClient
    mockAgentClient = {
      callTool: vi.fn(),
    } as any;

    // Mock original tool
    mockOriginalTool = {
      name: 'getLogs',
      description: 'Get application logs for debugging',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'number', description: 'User ID to get logs for' },
          timeRange: { type: 'string', description: 'Time range for logs' }
        },
        required: ['userId']
      }
    };

    // Create summarizer tool instance
    summarizerTool = new SummarizerToolInstance(
      mockOriginalTool,
      'gpt-4o-mini',
      'test-api-key',
      mockAgentClient
    );
  });

  describe('constructor', () => {
    it('should create instance with correct tool name', () => {
      expect(summarizerTool.toolName).toBe('summarize_getLogs');
    });
  });

  describe('getToolDefinition', () => {
    it('should return correct tool definition with merged schema', () => {
      const definition = summarizerTool.getToolDefinition();
      
      expect(definition).toEqual({
        type: 'function',
        function: {
          name: 'summarize_getLogs',
          description: 'Execute getLogs and summarize the results. Get application logs for debugging',
          parameters: {
            type: 'object',
            properties: {
              _prompt: {
                type: 'string',
                description: 'Instructions for how to summarize the tool results'
              },
              userId: { type: 'number', description: 'User ID to get logs for' },
              timeRange: { type: 'string', description: 'Time range for logs' }
            },
            required: ['_prompt', 'userId']
          }
        }
      });
    });
  });

  describe('canHandle', () => {
    it('should return true for matching tool name', () => {
      expect(summarizerTool.canHandle('summarize_getLogs')).toBe(true);
    });

    it('should return false for non-matching tool name', () => {
      expect(summarizerTool.canHandle('summarize_otherTool')).toBe(false);
      expect(summarizerTool.canHandle('getLogs')).toBe(false);
    });
  });

  describe('execute', () => {
    it('should return error for invalid parameters', async () => {
      const result = await summarizerTool.execute(null);
      
      expect(result).toEqual({
        success: false,
        error: 'Invalid parameters for summarizer tool'
      });
    });

    it('should return error for missing _prompt', async () => {
      const result = await summarizerTool.execute({
        userId: 123,
        timeRange: '24h'
      });
      
      expect(result).toEqual({
        success: false,
        error: 'Missing required _prompt parameter'
      });
    });

    it('should execute original tool and return summary on success', async () => {
      // Mock successful tool execution
      const mockToolResult = {
        logs: [
          { level: 'error', message: 'Database connection failed' },
          { level: 'info', message: 'Server started' }
        ]
      };
      
      vi.mocked(mockAgentClient.callTool).mockResolvedValue(mockToolResult);

      // Mock OpenAI response
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: 'Found 1 error: Database connection failed. Also 1 info message about server startup.'
          }
        }],
        usage: {
          total_tokens: 45
        }
      };

      mockCreate.mockResolvedValue(mockOpenAIResponse);

      const result = await summarizerTool.execute({
        _prompt: 'Focus on errors only',
        userId: 123,
        timeRange: '24h'
      });

      expect(result.success).toBe(true);
      expect(result.originalTool).toBe('getLogs');
      expect(result.originalResult).toEqual(mockToolResult);
      expect(result.summary).toBe('Found 1 error: Database connection failed. Also 1 info message about server startup.');
      expect(result.tokensUsed).toBe(45);

      // Verify original tool was called with correct parameters
      expect(mockAgentClient.callTool).toHaveBeenCalledWith('getLogs', {
        userId: 123,
        timeRange: '24h'
      });

      // Verify OpenAI was called with correct parameters
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes tool execution results based on user instructions. Provide clear, concise summaries that highlight the most relevant information.'
          },
          {
            role: 'user',
            content: expect.stringContaining('Focus on errors only')
          }
        ],
        temperature: 0.3
      });
    });

    it('should handle tool execution errors gracefully', async () => {
      // Mock tool execution failure
      vi.mocked(mockAgentClient.callTool).mockRejectedValue(new Error('Tool execution failed'));

      const result = await summarizerTool.execute({
        _prompt: 'Summarize results',
        userId: 123
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution failed');
      expect(result.originalTool).toBe('getLogs');
    });

    it('should handle OpenAI API errors gracefully', async () => {
      // Mock successful tool execution
      const mockToolResult = { data: 'test' };
      vi.mocked(mockAgentClient.callTool).mockResolvedValue(mockToolResult);

      // Mock OpenAI failure
      mockCreate.mockRejectedValue(new Error('OpenAI API failed'));

      const result = await summarizerTool.execute({
        _prompt: 'Summarize results',
        userId: 123
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Summarization failed');
      expect(result.originalTool).toBe('getLogs');
    });

    it('should handle missing token usage information gracefully', async () => {
      // Mock successful tool execution
      const mockToolResult = { logs: [{ level: 'info', message: 'Test log' }] };
      vi.mocked(mockAgentClient.callTool).mockResolvedValue(mockToolResult);

      // Mock OpenAI response without usage information
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: 'Summary without usage info'
          }
        }]
        // No usage field
      };

      mockCreate.mockResolvedValue(mockOpenAIResponse);

      const result = await summarizerTool.execute({
        _prompt: 'Summarize results',
        userId: 123
      });

      expect(result.success).toBe(true);
      expect(result.summary).toBe('Summary without usage info');
      expect(result.tokensUsed).toBe(0); // Should default to 0 when no usage info
    });
  });
});

describe('createSummarizerTools', () => {
  let mockAgentClient: AgentClient;
  let mockTools: AgentTool[];

  beforeEach(() => {
    mockAgentClient = {
      callTool: vi.fn(),
    } as any;

    mockTools = [
      {
        name: 'getLogs',
        description: 'Get logs',
        parameters: { type: 'object', properties: {}, required: [] }
      },
      {
        name: 'fetchUser',
        description: 'Fetch user data',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    ];
  });

  it('should create summarizer tools for all available tools', () => {
    const summarizerTools = createSummarizerTools(
      mockTools,
      'gpt-4o-mini',
      'test-api-key',
      mockAgentClient
    );

    expect(summarizerTools).toHaveLength(2);
    expect(summarizerTools[0].toolName).toBe('summarize_getLogs');
    expect(summarizerTools[1].toolName).toBe('summarize_fetchUser');
  });

  it('should return empty array for empty tools', () => {
    const summarizerTools = createSummarizerTools(
      [],
      'gpt-4o-mini',
      'test-api-key',
      mockAgentClient
    );

    expect(summarizerTools).toHaveLength(0);
  });
});
