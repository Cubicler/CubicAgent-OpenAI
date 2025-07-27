import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAICubicAgent, type OpenAIAgentConfig } from '../src/openai-cubicagent';
import type { AgentRequest, CallContext, JSONValue, JSONObject, ProviderSpecResponse } from '@cubicler/cubicagentkit';

// Mock the OpenAI completion create method with any type
const mockCreate = vi.fn() as any;

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: mockCreate,
    },
  },
};

// Mock CubicAgent
const mockCubicAgent = {
  onCall: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

// Mock CubiclerClient
const mockCubiclerClient = {};

// Create properly typed mock functions
const mockGetProviderSpec = vi.fn() as any;
const mockExecuteFunction = vi.fn() as any;

// Mock the dependencies
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => mockOpenAI),
  };
});

vi.mock('@cubicler/cubicagentkit', () => ({
  CubicAgent: vi.fn().mockImplementation(() => mockCubicAgent),
  CubiclerClient: vi.fn().mockImplementation(() => mockCubiclerClient),
}));

describe('OpenAICubicAgent', () => {
  let agent: OpenAICubicAgent;
  let mockConfig: OpenAIAgentConfig;
  let mockContext: CallContext;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock config
    mockConfig = {
      agentPort: 3000,
      agentName: 'TestAgent',
      openaiApiKey: 'test-api-key',
      openaiModel: 'gpt-4',
      agentTemperature: 0.7,
      maxTokens: 1500,
      cubiclerUrl: 'http://localhost:1503',
      agentTimeout: 8000,
      agentMaxRetries: 5,
      maxFunctionIterations: 10,
      logLevel: 'info'
    };

    // Mock context
    mockContext = {
      getProviderSpec: mockGetProviderSpec,
      executeFunction: mockExecuteFunction,
    };
  });

  describe('constructor', () => {
    it('should create an instance with valid configuration', () => {
      agent = new OpenAICubicAgent(mockConfig);
      expect(agent).toBeInstanceOf(OpenAICubicAgent);
    });

    it('should throw error if openaiApiKey is missing', () => {
      const invalidConfig = { ...mockConfig, openaiApiKey: '' };
      expect(() => new OpenAICubicAgent(invalidConfig)).toThrow('Missing required configuration: openaiApiKey');
    });

    it('should throw error if agentName is missing', () => {
      const invalidConfig = { ...mockConfig, agentName: '' };
      expect(() => new OpenAICubicAgent(invalidConfig)).toThrow('Missing required configuration: agentName');
    });

    it('should register the call handler', () => {
      agent = new OpenAICubicAgent(mockConfig);
      expect(mockCubicAgent.onCall).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('start', () => {
    beforeEach(() => {
      agent = new OpenAICubicAgent(mockConfig);
    });

    it('should start the underlying CubicAgent', () => {
      const callback = vi.fn();
      agent.start(callback);
      expect(mockCubicAgent.start).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      agent = new OpenAICubicAgent(mockConfig);
    });

    it('should stop the underlying CubicAgent', () => {
      agent.stop();
      expect(mockCubicAgent.stop).toHaveBeenCalled();
    });
  });

  describe('getCubicAgent', () => {
    beforeEach(() => {
      agent = new OpenAICubicAgent(mockConfig);
    });

    it('should return the underlying CubicAgent instance', () => {
      const cubicAgent = agent.getCubicAgent();
      expect(cubicAgent).toBe(mockCubicAgent);
    });
  });

  describe('handleCall (via private method testing)', () => {
    let handleCallMethod: (request: AgentRequest, context: CallContext) => Promise<string>;

    beforeEach(() => {
      agent = new OpenAICubicAgent(mockConfig);
      // Get the handler that was registered
      const onCallCalls = mockCubicAgent.onCall.mock.calls;
      expect(onCallCalls.length).toBe(1);
      handleCallMethod = onCallCalls[0][0] as (request: AgentRequest, context: CallContext) => Promise<string>;
    });

    it('should successfully process a request and return OpenAI response', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'You are a helpful assistant',
        messages: [
          { sender: 'user', content: 'Hello, how are you?' },
          { sender: 'TestAgent', content: 'I am doing well, thank you!' },
          { sender: 'user', content: 'What can you help me with?' },
        ],
        providers: [],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'I can help you with various tasks!',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await handleCallMethod(mockRequest, mockContext);

      expect(result).toBe('I can help you with various tasks!');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: expect.stringContaining('You are a helpful assistant')
          },
          { role: 'user', content: '[user]: Hello, how are you?' },
          { role: 'assistant', content: '[me]: I am doing well, thank you!' },
          { role: 'user', content: '[user]: What can you help me with?' },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });
    });

    it('should handle messages with different senders correctly', async () => {
      const requestWithDifferentSenders: AgentRequest = {
        prompt: 'System prompt',
        messages: [
          { sender: 'user', content: 'User message' },
          { sender: 'TestAgent', content: 'Agent response' },
          { sender: 'AnotherAgent', content: 'Another agent message' },
        ],
        providers: [],
      };

      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await handleCallMethod(requestWithDifferentSenders, mockContext);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: expect.stringContaining('System prompt')
          },
          { role: 'user', content: '[user]: User message' },
          { role: 'assistant', content: '[me]: Agent response' },
          { role: 'user', content: '[AnotherAgent]: Another agent message' },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });
    });

    it('should handle request with only prompt', async () => {
      const requestWithOnlyPrompt: AgentRequest = {
        prompt: 'Just a prompt',
        messages: [],
        providers: [],
      };

      const mockResponse = {
        choices: [{ message: { content: 'Response to prompt' } }],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await handleCallMethod(requestWithOnlyPrompt, mockContext);

      expect(result).toBe('Response to prompt');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{ 
          role: 'system', 
          content: expect.stringContaining('Just a prompt')
        }],
        temperature: 0.7,
        max_tokens: 1500,
      });
    });

    it('should throw error when no messages to process', async () => {
      const emptyRequest: AgentRequest = {
        prompt: '',
        messages: [],
        providers: [],
      };

      const mockResponse = {
        choices: [{ message: { content: 'Response to empty prompt' } }],
      };

      mockCreate.mockResolvedValue(mockResponse);

      // This should work now since we always have at least the system message
      const result = await handleCallMethod(emptyRequest, mockContext);
      expect(result).toBe('Response to empty prompt');
    });

    it('should throw error when OpenAI returns empty response', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'Test prompt',
        messages: [{ sender: 'user', content: 'Test message' }],
        providers: [],
      };

      const mockResponse = {
        choices: [{ message: { content: null } }],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(handleCallMethod(mockRequest, mockContext)).rejects.toThrow('OpenAI returned empty final message');
    });

    it('should handle OpenAI API errors', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'Test prompt',
        messages: [{ sender: 'user', content: 'Test message' }],
        providers: [],
      };

      const apiError = new Error('OpenAI API Error');
      mockCreate.mockRejectedValue(apiError);

      await expect(handleCallMethod(mockRequest, mockContext)).rejects.toThrow('OpenAI Agent Error: OpenAI API Error');
    });

    it('should handle unknown errors', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'Test prompt',
        messages: [{ sender: 'user', content: 'Test message' }],
        providers: [],
      };

      mockCreate.mockRejectedValue('Unknown error');

      await expect(handleCallMethod(mockRequest, mockContext)).rejects.toThrow('OpenAI Agent Error: Unknown error occurred');
    });
  });

  describe('Enhanced message formatting and providers', () => {
    let handleCallMethod: (request: AgentRequest, context: CallContext) => Promise<string>;

    beforeEach(() => {
      agent = new OpenAICubicAgent(mockConfig);
      const onCallCalls = mockCubicAgent.onCall.mock.calls;
      handleCallMethod = onCallCalls[0][0] as (request: AgentRequest, context: CallContext) => Promise<string>;
    });

    it('should format messages with [sender]: content and rename agent to [me]', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'You are a helpful assistant',
        messages: [
          { sender: 'user', content: 'Hello there' },
          { sender: 'TestAgent', content: 'Hello! How can I help?' },
          { sender: 'OtherAgent', content: 'I have some info' },
        ],
        providers: [],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'I understand the conversation format.',
              tool_calls: null
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await handleCallMethod(mockRequest, mockContext);

      // Verify message formatting
      const callArgs = mockCreate.mock.calls[0][0];
      const messages = callArgs.messages;
      expect(messages[1].content).toBe('[user]: Hello there');
      expect(messages[2].content).toBe('[me]: Hello! How can I help?');
      expect(messages[3].content).toBe('[OtherAgent]: I have some info');
    });

    it('should include provider information in system prompt', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'You are a helpful assistant',
        messages: [],
        providers: [
          { name: 'weather', description: 'Provides weather information' },
          { name: 'calendar', description: 'Manages calendar events' }
        ],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'I see the available providers.',
              tool_calls: null
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await handleCallMethod(mockRequest, mockContext);

      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.messages[0];
      expect(systemMessage.content).toContain('AVAILABLE PROVIDERS');
      expect(systemMessage.content).toContain('weather: Provides weather information');
      expect(systemMessage.content).toContain('calendar: Manages calendar events');
      expect(systemMessage.content).toContain('use the getProviderSpec function');
    });

    it('should include iteration tracking in system prompt', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'You are a helpful assistant',
        messages: [],
        providers: [],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'I understand the iteration tracking.',
              tool_calls: null
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await handleCallMethod(mockRequest, mockContext);

      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.messages[0];
      expect(systemMessage.content).toContain('FUNCTION CALLING STATUS: You are currently in iteration 1/10');
      expect(systemMessage.content).toContain('be mindful of the remaining iterations');
    });

    it('should include tools for providers with getProviderSpec', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'You are a helpful assistant',
        messages: [],
        providers: [
          { name: 'weather', description: 'Weather provider' }
        ],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'I see the tools available.',
              tool_calls: null
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await handleCallMethod(mockRequest, mockContext);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.tools).toBeDefined();
      expect(callArgs.tools).toHaveLength(1);
      expect(callArgs.tools[0].function.name).toBe('getProviderSpec');
      expect(callArgs.tool_choice).toBe('auto');
    });
  });

  describe('Function calling integration', () => {
    let handleCallMethod: (request: AgentRequest, context: CallContext) => Promise<string>;

    beforeEach(() => {
      agent = new OpenAICubicAgent(mockConfig);
      const onCallCalls = mockCubicAgent.onCall.mock.calls;
      handleCallMethod = onCallCalls[0][0] as (request: AgentRequest, context: CallContext) => Promise<string>;
      
      // Reset mock functions
      mockGetProviderSpec.mockReset();
      mockExecuteFunction.mockReset();
    });

    it('should handle function calling loop with tool calls', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'You are a helpful assistant',
        messages: [],
        providers: [
          { name: 'weather', description: 'Weather provider' }
        ],
      };

      // First call: GPT wants to call getProviderSpec
      const firstResponse = {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'getProviderSpec',
                    arguments: '{"providerName": "weather"}'
                  }
                }
              ]
            },
          },
        ],
      };

      // Second call: GPT responds after getting provider spec
      const secondResponse = {
        choices: [
          {
            message: {
              content: 'I can help you with weather information!',
              tool_calls: null
            },
          },
        ],
      };

      mockCreate
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      // Mock the context methods
      mockGetProviderSpec.mockResolvedValue({
        context: 'Weather API context',
        functions: [
          {
            name: 'getCurrentWeather',
            description: 'Get current weather',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' }
              }
            }
          }
        ]
      });

      const result = await handleCallMethod(mockRequest, mockContext);

      expect(result).toBe('I can help you with weather information!');
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockGetProviderSpec).toHaveBeenCalledWith('weather');
    });

    it('should handle multiple iterations with different tool calls', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'Help me with weather',
        messages: [],
        providers: [
          { name: 'weather', description: 'Weather provider' }
        ],
      };

      // Iteration 1: Get provider spec
      const firstResponse = {
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: 'call_1',
              type: 'function',
              function: {
                name: 'getProviderSpec',
                arguments: '{"providerName": "weather"}'
              }
            }]
          }
        }]
      };

      // Iteration 2: Call weather function
      const secondResponse = {
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: 'call_2',
              type: 'function',
              function: {
                name: 'getCurrentWeather',
                arguments: '{"location": "London"}'
              }
            }]
          }
        }]
      };

      // Iteration 3: Final response
      const thirdResponse = {
        choices: [{
          message: {
            content: 'The weather in London is sunny, 22°C.',
            tool_calls: null
          }
        }]
      };

      mockCreate
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse)
        .mockResolvedValueOnce(thirdResponse);

      mockGetProviderSpec.mockResolvedValue({
        context: 'Weather API',
        functions: [{
          name: 'getCurrentWeather',
          description: 'Get weather',
          parameters: {
            type: 'object',
            properties: { location: { type: 'string' } }
          }
        }]
      });

      mockExecuteFunction.mockResolvedValue({
        temperature: 22,
        condition: 'sunny',
        location: 'London'
      });

      const result = await handleCallMethod(mockRequest, mockContext);

      expect(result).toBe('The weather in London is sunny, 22°C.');
      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockGetProviderSpec).toHaveBeenCalledWith('weather');
      expect(mockExecuteFunction).toHaveBeenCalledWith('getCurrentWeather', { location: 'London' });
    });

    it('should handle maximum iteration limit', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'Test infinite loop',
        messages: [],
        providers: [{ name: 'test', description: 'Test provider' }],
      };

      // Always return tool calls to trigger infinite loop
      const infiniteToolCallsResponse = {
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: 'call_infinite',
              type: 'function',
              function: {
                name: 'getProviderSpec',
                arguments: '{"providerName": "test"}'
              }
            }]
          }
        }]
      };

      mockCreate.mockResolvedValue(infiniteToolCallsResponse);

      mockGetProviderSpec.mockResolvedValue({
        context: 'Test context',
        functions: []
      });

      await expect(handleCallMethod(mockRequest, mockContext)).rejects.toThrow(
        'Function calling loop exceeded maximum iterations (10)'
      );

      expect(mockCreate).toHaveBeenCalledTimes(10);
    });

    it('should handle function execution errors gracefully', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'Test function error',
        messages: [],
        providers: [{ name: 'weather', description: 'Weather provider' }],
      };

      const toolCallResponse = {
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: 'call_error',
              type: 'function',
              function: {
                name: 'getProviderSpec',
                arguments: '{"providerName": "weather"}'
              }
            }]
          }
        }]
      };

      const finalResponse = {
        choices: [{
          message: {
            content: 'I encountered an error but handled it.',
            tool_calls: null
          }
        }]
      };

      mockCreate
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce(finalResponse);

      mockGetProviderSpec.mockRejectedValue(new Error('Provider not found'));

      const result = await handleCallMethod(mockRequest, mockContext);

      expect(result).toBe('I encountered an error but handled it.');
      expect(mockCreate).toHaveBeenCalledTimes(2);

      // Check that error was included in tool result
      const secondCallArgs = mockCreate.mock.calls[1][0];
      const toolMessage = secondCallArgs.messages.find((msg: any) => msg.role === 'tool');
      expect(toolMessage).toBeDefined();
      const toolContent = JSON.parse(toolMessage.content);
      expect(toolContent.error).toContain('Failed to get provider spec');
    });

    it('should handle invalid JSON in tool call arguments', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'Test invalid JSON',
        messages: [],
        providers: [{ name: 'weather', description: 'Weather provider' }],
      };

      const invalidJsonResponse = {
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: 'call_invalid',
              type: 'function',
              function: {
                name: 'getProviderSpec',
                arguments: '{"invalid": json}'
              }
            }]
          }
        }]
      };

      mockCreate.mockResolvedValueOnce(invalidJsonResponse);

      await expect(handleCallMethod(mockRequest, mockContext)).rejects.toThrow();
    });

    it('should handle OpenAI API returning no choices', async () => {
      const mockRequest: AgentRequest = {
        prompt: 'Test no choices',
        messages: [],
        providers: [],
      };

      const noChoicesResponse = {
        choices: []
      };

      mockCreate.mockResolvedValue(noChoicesResponse);

      await expect(handleCallMethod(mockRequest, mockContext)).rejects.toThrow('OpenAI returned no choices');
    });
  });

  describe('Configuration edge cases', () => {
    it('should throw error for missing openaiApiKey and agentName', () => {
      const invalidConfig = {
        ...mockConfig,
        openaiApiKey: '',
        agentName: ''
      };

      expect(() => new OpenAICubicAgent(invalidConfig)).toThrow(
        'Missing required configuration: openaiApiKey, agentName'
      );
    });

    it('should handle extreme configuration values', () => {
      const extremeConfig = {
        ...mockConfig,
        agentPort: 0,
        agentTemperature: 0,
        maxTokens: 1,
        agentTimeout: 1,
        agentMaxRetries: 0,
        maxFunctionIterations: 1
      };

      expect(() => new OpenAICubicAgent(extremeConfig)).not.toThrow();
    });

    it('should handle very large configuration values', () => {
      const largeConfig = {
        ...mockConfig,
        agentPort: 65535,
        agentTemperature: 2.0,
        maxTokens: 128000,
        agentTimeout: 300000,
        agentMaxRetries: 100,
        maxFunctionIterations: 50
      };

      expect(() => new OpenAICubicAgent(largeConfig)).not.toThrow();
    });
  });
});
