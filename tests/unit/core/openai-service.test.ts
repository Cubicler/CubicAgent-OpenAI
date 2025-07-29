import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { OpenAIService } from '../../../src/core/openai-service.js';
import type { OpenAIConfig, DispatchConfig } from '../../../src/config/environment.js';
import type { AgentRequest, AgentClient, AgentTool } from '@cubicler/cubicagentkit';
import OpenAI from 'openai';

// Mock dependencies
vi.mock('openai');
vi.mock('@cubicler/cubicagentkit', () => ({
  CubicAgent: vi.fn().mockImplementation(() => ({
    start: vi.fn()
  })),
  AxiosAgentClient: vi.fn().mockImplementation(() => ({})),
  ExpressAgentServer: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../../../src/utils/message-helper.js', () => ({
  buildOpenAIMessages: vi.fn(),
  buildSystemMessage: vi.fn(),
  cleanFinalResponse: vi.fn()
}));

describe('OpenAIService', () => {
  let openAIService: OpenAIService;
  let mockOpenAI: any;
  let mockOpenAIConfig: OpenAIConfig;
  let mockDispatchConfig: DispatchConfig;
  let mockAgentClient: AgentClient;
  let mockConsoleLog: Mock;
  let mockConsoleError: Mock;

  const createMockAgentRequest = (): AgentRequest => ({
    agent: {
      identifier: 'test-agent',
      name: 'Test Agent',
      description: 'Test agent for unit tests',
      prompt: 'You are a test agent for unit testing purposes.'
    },
    messages: [
      {
        type: 'text',
        sender: { id: 'user-1', name: 'Test User' },
        content: 'Hello, world!'
      }
    ],
    tools: [
      {
        name: 'cubicler.available_servers',
        description: 'Get available servers',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'cubicler.fetch_server_tools',
        description: 'Fetch server tools',
        parameters: {
          type: 'object',
          properties: {
            serverIdentifier: { type: 'string' }
          },
          required: ['serverIdentifier']
        }
      }
    ],
    servers: []
  });

  beforeEach(() => {
    // Mock console methods
    mockConsoleLog = vi.fn();
    mockConsoleError = vi.fn();
    vi.stubGlobal('console', {
      log: mockConsoleLog,
      error: mockConsoleError
    });

    // Create mock configurations
    mockOpenAIConfig = {
      apiKey: 'test-api-key',
      model: 'gpt-4o',
      temperature: 0.7,
      sessionMaxTokens: 4096,
      organization: 'test-org',
      project: 'test-project',
      baseURL: 'https://api.openai.com/v1',
      timeout: 60000,
      maxRetries: 2
    };

    mockDispatchConfig = {
      timeout: 30000,
      mcpMaxRetries: 3,
      mcpCallTimeout: 10000,
      sessionMaxIteration: 10,
      endpoint: '/',
      agentPort: 3000
    };

    // Mock OpenAI client
    mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    };
    (OpenAI as any).mockImplementation(() => mockOpenAI);

    // Mock agent client with proper vitest mock
    mockAgentClient = {
      callTool: vi.fn() as any,
      initialize: vi.fn() as any
    } as AgentClient;

    // Create OpenAIService instance
    openAIService = new OpenAIService(
      mockOpenAIConfig,
      mockDispatchConfig,
      'http://localhost:8080'
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should initialize OpenAI client with correct configuration', () => {
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: mockOpenAIConfig.apiKey,
        organization: mockOpenAIConfig.organization,
        project: mockOpenAIConfig.project,
        baseURL: mockOpenAIConfig.baseURL,
        timeout: mockOpenAIConfig.timeout,
        maxRetries: mockOpenAIConfig.maxRetries
      });
    });

    it('should log initialization with correct parameters', () => {
      expect(mockConsoleLog).toHaveBeenCalledWith('OpenAIService initialized', {
        model: mockOpenAIConfig.model,
        temperature: mockOpenAIConfig.temperature,
        maxTokens: mockOpenAIConfig.sessionMaxTokens,
        maxIterations: mockDispatchConfig.sessionMaxIteration,
        endpoint: mockDispatchConfig.endpoint,
        agentPort: mockDispatchConfig.agentPort,
        cubiclerUrl: 'http://localhost:8080'
      });
    });
  });

  describe('buildOpenAITools', () => {
    it('should convert AgentTool to OpenAI ChatCompletionTool format', () => {
      const tools: AgentTool[] = [
        {
          name: 'test-tool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {
              param1: { type: 'string' }
            }
          }
        }
      ];

      // Access private method through any casting
      const result = (openAIService as any).buildOpenAITools(tools);

      expect(result).toEqual([
        {
          type: 'function',
          function: {
            name: 'test-tool',
            description: 'A test tool',
            parameters: {
              type: 'object',
              properties: {
                param1: { type: 'string' }
              }
            }
          }
        }
      ]);
    });

    it('should handle empty tools array', () => {
      const result = (openAIService as any).buildOpenAITools([]);
      expect(result).toEqual([]);
    });
  });

  describe('callOpenAI', () => {
    it('should call OpenAI API with correct parameters', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test response',
            tool_calls: undefined
          }
        }],
        usage: {
          total_tokens: 100
        }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const messages = [{ role: 'user', content: 'Test message' }] as any[];
      const tools = [{
        type: 'function',
        function: {
          name: 'test-tool',
          description: 'Test tool',
          parameters: {}
        }
      }] as any[];

      const result = await (openAIService as any).callOpenAI(messages, tools);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: mockOpenAIConfig.model,
        messages,
        temperature: mockOpenAIConfig.temperature,
        max_tokens: mockOpenAIConfig.sessionMaxTokens,
        tools
      });

      expect(result).toEqual({
        content: 'Test response',
        usedTokens: 100
      });
    });

    it('should not include tools parameter when tools array is empty', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test response'
          }
        }],
        usage: {
          total_tokens: 50
        }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const messages = [{ role: 'user', content: 'Test message' }] as any[];
      const tools: any[] = [];

      await (openAIService as any).callOpenAI(messages, tools);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: mockOpenAIConfig.model,
        messages,
        temperature: mockOpenAIConfig.temperature,
        max_tokens: mockOpenAIConfig.sessionMaxTokens
      });
    });

    it('should include tool_calls in result when present', async () => {
      const mockToolCalls = [{
        id: 'call_123',
        type: 'function',
        function: {
          name: 'test-tool',
          arguments: '{"param": "value"}'
        }
      }];

      const mockResponse = {
        choices: [{
          message: {
            content: null,
            tool_calls: mockToolCalls
          }
        }],
        usage: {
          total_tokens: 150
        }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await (openAIService as any).callOpenAI([], []);

      expect(result).toEqual({
        content: null,
        usedTokens: 150,
        toolCalls: mockToolCalls
      });
    });

    it('should handle OpenAI API errors', async () => {
      const apiError = new Error('OpenAI API Error');
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      await expect((openAIService as any).callOpenAI([], [])).rejects.toThrow(
        'OpenAI API call failed: OpenAI API Error'
      );

      expect(mockConsoleError).toHaveBeenCalledWith('OpenAI API error:', apiError);
    });

    it('should handle missing usage information', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test response'
          }
        }],
        usage: undefined
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await (openAIService as any).callOpenAI([], []);

      expect(result.usedTokens).toBe(0);
    });
  });

  describe('executeToolCalls', () => {
    it('should execute tool calls and return tool messages', async () => {
      const mockToolCalls = [{
        id: 'call_123',
        function: {
          name: 'test-tool',
          arguments: '{"param": "value"}'
        }
      }] as any[];

      const mockToolResult = { success: true, data: 'test result' };
      (mockAgentClient.callTool as any).mockResolvedValue(mockToolResult);

      const currentTools = [] as any[];
      const result = await (openAIService as any).executeToolCalls(
        mockToolCalls,
        mockAgentClient,
        currentTools
      );

      expect(mockAgentClient.callTool).toHaveBeenCalledWith('test-tool', { param: 'value' });
      expect(result.toolMessages).toEqual([{
        role: 'tool',
        content: JSON.stringify(mockToolResult),
        tool_call_id: 'call_123'
      }]);
      expect(result.updatedTools).toEqual(currentTools);
    });

    it('should handle cubicler.fetch_server_tools and add new tools', async () => {
      const mockToolCalls = [{
        id: 'call_123',
        function: {
          name: 'cubicler.fetch_server_tools',
          arguments: '{"serverIdentifier": "test-server"}'
        }
      }] as any[];

      const newServerTools: AgentTool[] = [{
        name: 'server-tool-1',
        description: 'Server tool 1',
        parameters: { 
          type: 'object',
          properties: {},
          required: []
        }
      }];

      const mockToolResult = { tools: newServerTools };
      (mockAgentClient.callTool as any).mockResolvedValue(mockToolResult);

      const currentTools = [] as any[];
      const result = await (openAIService as any).executeToolCalls(
        mockToolCalls,
        mockAgentClient,
        currentTools
      );

      expect(result.updatedTools).toHaveLength(1);
      expect(result.updatedTools[0]).toEqual({
        type: 'function',
        function: {
          name: 'server-tool-1',
          description: 'Server tool 1',
          parameters: { 
            type: 'object',
            properties: {},
            required: []
          }
        }
      });
      expect(mockConsoleLog).toHaveBeenCalledWith('Added 1 new tools from server');
    });

    it('should handle tool execution errors', async () => {
      const mockToolCalls = [{
        id: 'call_123',
        function: {
          name: 'failing-tool',
          arguments: '{"param": "value"}'
        }
      }] as any[];

      const toolError = new Error('Tool execution failed');
      (mockAgentClient.callTool as any).mockRejectedValue(toolError);

      const result = await (openAIService as any).executeToolCalls(
        mockToolCalls,
        mockAgentClient,
        []
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Tool execution failed for failing-tool:',
        toolError
      );
      expect(result.toolMessages).toEqual([{
        role: 'tool',
        content: JSON.stringify({
          error: 'Failed to execute failing-tool: Tool execution failed'
        }),
        tool_call_id: 'call_123'
      }]);
    });

    it('should handle invalid JSON in tool arguments', async () => {
      const mockToolCalls = [{
        id: 'call_123',
        function: {
          name: 'test-tool',
          arguments: 'invalid-json'
        }
      }] as any[];

      const result = await (openAIService as any).executeToolCalls(
        mockToolCalls,
        mockAgentClient,
        []
      );

      expect(result.toolMessages).toHaveLength(1);
      expect(result.toolMessages[0].content).toContain('error');
      expect(result.toolMessages[0].tool_call_id).toBe('call_123');
    });
  });

  describe('executeIterativeLoop', () => {
    let mockRequest: AgentRequest;
    let mockBuildOpenAIMessages: Mock;
    let mockBuildSystemMessage: Mock;
    let mockCleanFinalResponse: Mock;

    beforeEach(async () => {
      mockRequest = createMockAgentRequest();
      
      // Import the mocked functions
      const messageHelper = await import('../../../src/utils/message-helper.js');
      mockBuildOpenAIMessages = messageHelper.buildOpenAIMessages as Mock;
      mockBuildSystemMessage = messageHelper.buildSystemMessage as Mock;
      mockCleanFinalResponse = messageHelper.cleanFinalResponse as Mock;

      // Setup default mock returns
      mockBuildOpenAIMessages.mockReturnValue([
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message' }
      ]);
      mockBuildSystemMessage.mockReturnValue('Updated system message');
      mockCleanFinalResponse.mockReturnValue('Cleaned response');
    });

    it('should handle simple conversation without tool calls', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Final response',
            tool_calls: undefined
          }
        }],
        usage: { total_tokens: 100 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await (openAIService as any).executeIterativeLoop(
        mockRequest,
        mockAgentClient
      );

      expect(result).toEqual({
        type: 'text',
        content: 'Cleaned response',
        usedToken: 100
      });
      expect(mockCleanFinalResponse).toHaveBeenCalledWith('Final response');
    });

    it('should handle conversation with tool calls', async () => {
      const mockToolCalls = [{
        id: 'call_123',
        function: {
          name: 'test-tool',
          arguments: '{"param": "value"}'
        }
      }];

      // First call with tool calls
      const mockResponseWithTools = {
        choices: [{
          message: {
            content: null,
            tool_calls: mockToolCalls
          }
        }],
        usage: { total_tokens: 150 }
      };

      // Second call with final response
      const mockFinalResponse = {
        choices: [{
          message: {
            content: 'Final response after tools'
          }
        }],
        usage: { total_tokens: 75 }
      };

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockResponseWithTools)
        .mockResolvedValueOnce(mockFinalResponse);

      (mockAgentClient.callTool as any).mockResolvedValue({ result: 'tool result' });

      const result = await (openAIService as any).executeIterativeLoop(
        mockRequest,
        mockAgentClient
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
      expect(mockAgentClient.callTool).toHaveBeenCalledWith('test-tool', { param: 'value' });
      expect(result).toEqual({
        type: 'text',
        content: 'Cleaned response',
        usedToken: 225
      });
    });

    it('should enforce maximum iteration limit', async () => {
      const mockResponseWithTools = {
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: 'call_123',
              function: {
                name: 'test-tool',
                arguments: '{}'
              }
            }]
          }
        }],
        usage: { total_tokens: 100 }
      };

      // Always return tool calls to force iteration limit
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponseWithTools);
      (mockAgentClient.callTool as any).mockResolvedValue({ result: 'tool result' });

      await expect((openAIService as any).executeIterativeLoop(
        mockRequest,
        mockAgentClient
      )).rejects.toThrow(
        `Maximum iterations (${mockDispatchConfig.sessionMaxIteration}) reached without final response`
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(
        mockDispatchConfig.sessionMaxIteration
      );
    });

    it('should update system message with iteration count', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Final response'
          }
        }],
        usage: { total_tokens: 100 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await (openAIService as any).executeIterativeLoop(mockRequest, mockAgentClient);

      expect(mockBuildSystemMessage).toHaveBeenCalledWith(
        mockRequest,
        mockOpenAIConfig,
        mockDispatchConfig,
        1
      );
    });

    it('should log iteration progress', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Final response'
          }
        }],
        usage: { total_tokens: 100 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await (openAIService as any).executeIterativeLoop(mockRequest, mockAgentClient);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        `Iteration 1/${mockDispatchConfig.sessionMaxIteration}`
      );
      expect(mockConsoleLog).toHaveBeenCalledWith('Final response received');
    });

    it('should handle OpenAI API errors during iteration', async () => {
      const apiError = new Error('API Error');
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      await expect((openAIService as any).executeIterativeLoop(
        mockRequest,
        mockAgentClient
      )).rejects.toThrow('OpenAI API call failed: API Error');
    });

    it('should accumulate token usage across iterations', async () => {
      const mockToolCalls = [{
        id: 'call_123',
        function: {
          name: 'test-tool',
          arguments: '{}'
        }
      }];

      const mockResponseWithTools = {
        choices: [{
          message: {
            content: null,
            tool_calls: mockToolCalls
          }
        }],
        usage: { total_tokens: 150 }
      };

      const mockFinalResponse = {
        choices: [{
          message: {
            content: 'Final response'
          }
        }],
        usage: { total_tokens: 75 }
      };

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockResponseWithTools)
        .mockResolvedValueOnce(mockFinalResponse);

      (mockAgentClient.callTool as any).mockResolvedValue({ result: 'tool result' });

      const result = await (openAIService as any).executeIterativeLoop(
        mockRequest,
        mockAgentClient
      );

      expect(result.usedToken).toBe(225); // 150 + 75
    });
  });

  describe('start', () => {
    it('should start the CubicAgent with correct handler', async () => {
      const mockCubicAgent = {
        start: vi.fn().mockResolvedValue(undefined)
      };
      (openAIService as any).cubicAgent = mockCubicAgent;

      await openAIService.start();

      expect(mockCubicAgent.start).toHaveBeenCalledWith(expect.any(Function));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `OpenAIService started at port ${mockDispatchConfig.agentPort}`
      );
    });

    it('should handle request processing errors gracefully', async () => {
      const mockRequest = createMockAgentRequest();
      const processingError = new Error('Processing failed');

      // Mock the CubicAgent start method to call the handler with an error
      const mockCubicAgent = {
        start: vi.fn().mockImplementation(async (handler) => {
          // Simulate calling the handler and throwing an error
          (openAIService as any).executeIterativeLoop = vi.fn().mockRejectedValue(processingError);
          const result = await handler(mockRequest, mockAgentClient, {});
          return result;
        })
      };
      (openAIService as any).cubicAgent = mockCubicAgent;

      await openAIService.start();

      // The handler should have been called
      expect(mockCubicAgent.start).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should return error response when executeIterativeLoop fails', async () => {
      const mockRequest = createMockAgentRequest();
      const error = new Error('Test error');

      // Mock executeIterativeLoop to throw
      vi.spyOn(openAIService as any, 'executeIterativeLoop').mockRejectedValue(error);

      // Get the handler function that would be passed to cubicAgent.start
      const mockCubicAgent = {
        start: vi.fn()
      };
      (openAIService as any).cubicAgent = mockCubicAgent;

      await openAIService.start();

      // Get the handler function
      const handler = mockCubicAgent.start.mock.calls[0][0];
      const result = await handler(mockRequest, mockAgentClient, {});

      expect(result).toEqual({
        type: 'text',
        content: 'Error: Test error',
        usedToken: 0
      });
      expect(mockConsoleError).toHaveBeenCalledWith('Error processing request:', error);
    });

    it('should handle non-Error exceptions', async () => {
      const mockRequest = createMockAgentRequest();
      const nonError = 'String error';

      vi.spyOn(openAIService as any, 'executeIterativeLoop').mockRejectedValue(nonError);

      const mockCubicAgent = {
        start: vi.fn()
      };
      (openAIService as any).cubicAgent = mockCubicAgent;

      await openAIService.start();

      const handler = mockCubicAgent.start.mock.calls[0][0];
      const result = await handler(mockRequest, mockAgentClient, {});

      expect(result).toEqual({
        type: 'text',
        content: 'Error: Unknown error',
        usedToken: 0
      });
    });
  });
});
