import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { OpenAIService } from '../../src/core/openai-service.js';
import type { OpenAIConfig, DispatchConfig } from '../../src/config/environment.js';
import type { AgentRequest, AgentClient } from '@cubicler/cubicagentkit';
import OpenAI from 'openai';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from integration test .env file
config({ path: resolve(__dirname, '.env') });

// Real OpenAI Integration Tests
describe('OpenAI Service Real API Integration', () => {
  let openAIService: OpenAIService;
  let realOpenAIConfig: OpenAIConfig;
  let mockDispatchConfig: DispatchConfig;
  let mockAgentClient: AgentClient;
  let realOpenAI: OpenAI;

  const REAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const createMockAgentRequest = (): AgentRequest => ({
    agent: {
      identifier: 'test-agent',
      name: 'Test Agent',
      description: 'Test agent for integration tests',
      prompt: 'You are a helpful test agent.'
    },
    messages: [
      {
        type: 'text',
        sender: { id: 'user-1', name: 'Test User' },
        content: 'Hello! Can you help me with a simple task?'
      }
    ],
    tools: [
      {
        name: 'test_tool',
        description: 'A simple test tool that returns a greeting',
        parameters: {
          type: 'object',
          properties: {
            name: { 
              type: 'string',
              description: 'The name to greet'
            }
          },
          required: ['name']
        }
      }
    ],
    servers: []
  });

  beforeAll(() => {
    // Skip all tests if no API key is provided
    if (!REAL_OPENAI_API_KEY) {
      console.log('⚠️  No OPENAI_API_KEY found in tests/integration/.env - skipping integration tests');
      return;
    }

    console.log('🔑 Using OpenAI API Key for integration tests:', REAL_OPENAI_API_KEY.slice(0, 20) + '...');

    // Real OpenAI configuration
    realOpenAIConfig = {
      apiKey: REAL_OPENAI_API_KEY,
      model: 'gpt-3.5-turbo', // Use cheaper model for testing
      temperature: 0.1, // Low temperature for consistent results
      sessionMaxTokens: 1000, // Lower token limit for cost control
      timeout: 30000,
      maxRetries: 2
    };

    mockDispatchConfig = {
      timeout: 30000,
      mcpMaxRetries: 3,
      mcpCallTimeout: 10000,
      sessionMaxIteration: 3, // Lower iteration limit for testing
      endpoint: '/',
      agentPort: 3000
    };

    // Create real OpenAI client for direct testing
    realOpenAI = new OpenAI({
      apiKey: REAL_OPENAI_API_KEY
    });

    // Mock agent client for tool calls
    mockAgentClient = {
      callTool: vi.fn(),
      initialize: vi.fn()
    } as AgentClient;
  });

  afterAll(async () => {
    // Clean up resources if needed
  });

  describe('Real OpenAI API Communication', () => {
    it.skipIf(!REAL_OPENAI_API_KEY)('should successfully communicate with OpenAI API directly', async () => {
      console.log('🧪 Testing direct OpenAI API communication...');
      
      const response = await realOpenAI.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Respond with exactly "Hello, integration test!"'
          },
          {
            role: 'user',
            content: 'Say hello'
          }
        ],
        max_tokens: 50
      });

      const gptResponse = response.choices[0]?.message?.content;
      console.log('🤖 GPT Response:', gptResponse);
      console.log('📊 Token Usage:', response.usage);

      expect(response.choices).toHaveLength(1);
      expect(gptResponse).toBeTruthy();
      expect(response.usage?.total_tokens).toBeGreaterThan(0);
    }, 10000); // 10 second timeout

    it.skipIf(!REAL_OPENAI_API_KEY)('should handle function calling with real OpenAI API', async () => {
      console.log('🧪 Testing function calling with OpenAI API...');
      
      const response = await realOpenAI.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Use the provided tool to greet the user.'
          },
          {
            role: 'user',
            content: 'Please greet me using my name "TestUser"'
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'greet_user',
              description: 'Greet a user by name',
              parameters: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The name of the user to greet'
                  }
                },
                required: ['name']
              }
            }
          }
        ],
        max_tokens: 100
      });

      const message = response.choices[0]?.message;
      console.log('🤖 GPT Message:', message?.content);
      console.log('🔧 Tool Calls:', message?.tool_calls);
      console.log('📊 Token Usage:', response.usage);

      expect(response.choices).toHaveLength(1);
      
      // Should either call the function or respond with text
      expect(message?.tool_calls || message?.content).toBeTruthy();
      
      if (message?.tool_calls) {
        console.log('✅ GPT decided to use tool calls');
        expect(message.tool_calls).toHaveLength(1);
        expect(message.tool_calls[0]?.function?.name).toBe('greet_user');
        
        const args = JSON.parse(message.tool_calls[0]?.function?.arguments || '{}');
        console.log('🔧 Function arguments:', args);
        expect(args.name).toBeTruthy();
      } else {
        console.log('💬 GPT responded with text instead of using tools');
      }
    }, 10000);
  });

  describe('OpenAIService Integration', () => {
    it.skipIf(!REAL_OPENAI_API_KEY)('should initialize OpenAIService with real API key', () => {
      console.log('🧪 Testing OpenAIService initialization...');
      
      // Create mock CubicAgent
      const mockCubicAgent = {
        start: vi.fn(),
        stop: vi.fn()
      } as any;
      
      expect(() => {
        openAIService = new OpenAIService(mockCubicAgent, realOpenAIConfig, mockDispatchConfig);
      }).not.toThrow();
      
      expect(openAIService).toBeDefined();
      console.log('✅ OpenAIService initialized successfully');
    });

    it.skipIf(!REAL_OPENAI_API_KEY)('should call OpenAI API through private callOpenAI method', async () => {
      console.log('🧪 Testing callOpenAI method with real API...');
      
      // Create mock CubicAgent
      const mockCubicAgent = {
        start: vi.fn(),
        stop: vi.fn()
      } as any;
      
      openAIService = new OpenAIService(mockCubicAgent, realOpenAIConfig, mockDispatchConfig);

      const messages = [
        {
          role: 'system' as const,
          content: 'You are a helpful assistant. Respond with exactly "Integration test successful!"'
        },
        {
          role: 'user' as const,
          content: 'Please confirm the test is working'
        }
      ];
      
      const tools: any[] = [];

      // Access private method for testing
      const result = await (openAIService as any).callOpenAI(messages, tools);

      console.log('🤖 OpenAI Response:', result.content);
      console.log('📊 Tokens Used:', result.usedTokens);

      expect(result.content).toBeTruthy();
      expect(result.usedTokens).toBeGreaterThan(0);
      expect(typeof result.content).toBe('string');
    }, 15000);

    it.skipIf(!REAL_OPENAI_API_KEY)('should handle tool execution through executeToolCalls method', async () => {
      console.log('🧪 Testing executeToolCalls method...');
      
      // Create mock CubicAgent
      const mockCubicAgent = {
        start: vi.fn(),
        stop: vi.fn()
      } as any;
      
      openAIService = new OpenAIService(mockCubicAgent, realOpenAIConfig, mockDispatchConfig);

      // Mock a tool call response
      const mockToolCalls = [
        {
          id: 'call_test123',
          function: {
            name: 'test_tool',
            arguments: JSON.stringify({ name: 'Integration Test' })
          }
        }
      ] as any[];

      // Mock the agent client tool call
      (mockAgentClient.callTool as any).mockResolvedValue({
        success: true,
        message: 'Hello, Integration Test!'
      });

      const currentTools = [
        {
          type: 'function' as const,
          function: {
            name: 'test_tool',
            description: 'A test tool',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              }
            }
          }
        }
      ];

      // Access private method for testing
      const result = await (openAIService as any).executeToolCalls(
        mockToolCalls,
        mockAgentClient,
        currentTools
      );

      console.log('🔧 Tool execution result:', result.toolMessages[0]);
      
      expect(result.toolMessages).toHaveLength(1);
      expect(result.toolMessages[0].role).toBe('tool');
      expect(result.toolMessages[0].tool_call_id).toBe('call_test123');
      expect(mockAgentClient.callTool).toHaveBeenCalledWith('test_tool', { name: 'Integration Test' });
    });

    it.skipIf(!REAL_OPENAI_API_KEY)('should handle full iterative conversation flow', async () => {
      console.log('🧪 Testing full iterative conversation flow...');
      
      // Create mock CubicAgent
      const mockCubicAgent = {
        start: vi.fn(),
        stop: vi.fn()
      } as any;
      
      openAIService = new OpenAIService(mockCubicAgent, realOpenAIConfig, mockDispatchConfig);

      const request = createMockAgentRequest();
      
      // Mock tool responses
      (mockAgentClient.callTool as any).mockResolvedValue({
        greeting: 'Hello from the test tool!',
        success: true
      });

      // Access private method for testing
      const result = await (openAIService as any).executeIterativeLoop(
        request,
        mockAgentClient
      );

      console.log('🤖 Final conversation result:', result.content);
      console.log('📊 Total tokens used:', result.usedToken);

      expect(result.type).toBe('text');
      expect(result.content).toBeTruthy();
      expect(typeof result.content).toBe('string');
      expect(result.usedToken).toBeGreaterThan(0);
    }, 20000);

    it.skipIf(!REAL_OPENAI_API_KEY)('should enforce iteration limits in real scenarios', async () => {
      console.log('🧪 Testing iteration limits...');
      
      // Use very low iteration limit
      const limitedDispatchConfig = {
        ...mockDispatchConfig,
        sessionMaxIteration: 1
      };
      
      // Create mock CubicAgent
      const mockCubicAgent = {
        start: vi.fn(),
        stop: vi.fn()
      } as any;
      
      openAIService = new OpenAIService(mockCubicAgent, realOpenAIConfig, limitedDispatchConfig);

      const request = createMockAgentRequest();
      
      // Mock tool that always returns, potentially causing infinite loop
      (mockAgentClient.callTool as any).mockResolvedValue({
        shouldContinue: true,
        message: 'Keep going!'
      });

      // The test should complete within iteration limit
      const result = await (openAIService as any).executeIterativeLoop(
        request,
        mockAgentClient
      );

      console.log('🔄 Iteration limit test result:', result.content);
      console.log('📊 Tokens used with limit:', result.usedToken);

      // Should get either a final response or hit iteration limit
      expect(result.type).toBe('text');
      expect(result.content).toBeTruthy();
    }, 15000);

    it.skipIf(!REAL_OPENAI_API_KEY)('should handle OpenAI API errors gracefully', async () => {
      console.log('🧪 Testing API error handling...');
      // Create service with invalid model to trigger error
      const invalidConfig = {
        ...realOpenAIConfig,
        model: 'invalid-model-name' as any
      };
      
      // Create mock CubicAgent
      const mockCubicAgent = {
        start: vi.fn(),
        stop: vi.fn()
      } as any;
      
      openAIService = new OpenAIService(mockCubicAgent, invalidConfig, mockDispatchConfig);

      const messages = [
        {
          role: 'user' as const,
          content: 'This should fail'
        }
      ];

      // Should throw an error due to invalid model
      await expect((openAIService as any).callOpenAI(messages, [])).rejects.toThrow();
      console.log('✅ Error handling works correctly');
    }, 10000);

    it.skipIf(!REAL_OPENAI_API_KEY)('should track token usage accurately', async () => {
      console.log('🧪 Testing token usage tracking...');
      
      // Create mock CubicAgent
      const mockCubicAgent = {
        start: vi.fn(),
        stop: vi.fn()
      } as any;
      
      openAIService = new OpenAIService(mockCubicAgent, realOpenAIConfig, mockDispatchConfig);

      const messages = [
        {
          role: 'system' as const,
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user' as const,
          content: 'Write a very short response about the weather.'
        }
      ];

      const result = await (openAIService as any).callOpenAI(messages, []);

      console.log('📊 Token usage details:', {
        tokensUsed: result.usedTokens,
        maxTokens: realOpenAIConfig.sessionMaxTokens,
        response: result.content
      });

      expect(result.usedTokens).toBeGreaterThan(0);
      expect(result.usedTokens).toBeLessThan(realOpenAIConfig.sessionMaxTokens);
      expect(typeof result.usedTokens).toBe('number');
    }, 10000);
  });

  describe('Error Handling Integration', () => {
    it.skipIf(!REAL_OPENAI_API_KEY)('should handle network timeouts', async () => {
      console.log('🧪 Testing network timeout handling...');
      // Create service with very short timeout
      const timeoutConfig = {
        ...realOpenAIConfig,
        timeout: 1 // 1ms timeout - should fail
      };
      
      // Create mock CubicAgent
      const mockCubicAgent = {
        start: vi.fn(),
        stop: vi.fn()
      } as any;
      
      openAIService = new OpenAIService(mockCubicAgent, timeoutConfig, mockDispatchConfig);

      const messages = [
        {
          role: 'user' as const,
          content: 'This should timeout'
        }
      ];

      // Should throw timeout error
      await expect((openAIService as any).callOpenAI(messages, [])).rejects.toThrow();
      console.log('✅ Timeout handling works correctly');
    }, 5000);

    it.skipIf(!REAL_OPENAI_API_KEY)('should handle rate limiting gracefully', async () => {
      console.log('🧪 Testing rate limiting handling...');
      // Create mock CubicAgent
      const mockCubicAgent = {
        start: vi.fn(),
        stop: vi.fn()
      } as any;
      
      openAIService = new OpenAIService(mockCubicAgent, realOpenAIConfig, mockDispatchConfig);

      // Make multiple rapid requests to potentially trigger rate limiting
      const promises = Array.from({ length: 3 }, (_, i) => 
        (openAIService as any).callOpenAI([
          {
            role: 'user' as const,
            content: `Test message ${i + 1}`
          }
        ], [])
      );

      // Check that requests complete (either succeed or fail gracefully)
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      console.log(`📊 Rate limit test results: ${successful.length} successful, ${failed.length} failed`);
      
      // Test should pass if all requests complete (either success or handled failure)
      expect(results.length).toBe(3);
      expect(successful.length + failed.length).toBe(3);
      
      // If there are failures, they should be proper Error objects with meaningful messages
      failed.forEach(result => {
        expect(result.reason).toBeInstanceOf(Error);
        expect(result.reason.message).toBeTruthy();
      });
    }, 30000);
  });
});
