import { config } from 'dotenv';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { OpenAICubicAgent } from '../../src/openai-cubicagent.js';
import { MockCubiclerServer, mockProviders } from './mock-cubicler.js';
import type { AgentRequest, CallContext } from '@cubicler/cubicagentkit';

// Load integration test environment
config({ path: resolve(__dirname, '.env.integration') });

/**
 * Integration Tests for OpenAI CubicAgent
 * These tests use the real OpenAI API with a mock Cubicler server
 */

// Check environment variables after loading the config
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RUN_INTEGRATION_TESTS = process.env.RUN_INTEGRATION_TESTS === 'true' && !!OPENAI_API_KEY;

const describeOrSkip = RUN_INTEGRATION_TESTS ? describe : describe.skip;

describeOrSkip('OpenAI Integration Tests', () => {
  let agent: OpenAICubicAgent;
  let mockCubicler: MockCubiclerServer;
  
  beforeAll(async () => {
    if (!RUN_INTEGRATION_TESTS) {
      console.log('⚠️  Skipping integration tests - check .env.integration configuration');
      return;
    }
    
    console.log('🧪 Running integration tests with real OpenAI API and mock Cubicler');
    
    // Start mock Cubicler server
    const mockPort = parseInt(process.env.MOCK_CUBICLER_PORT || '1504');
    mockCubicler = new MockCubiclerServer(mockPort);
    await mockCubicler.start();
    
    // Configure and create agent
    const config = {
      agentPort: parseInt(process.env.AGENT_PORT || '3001'),
      agentName: process.env.AGENT_NAME || 'Test-CubicAgent-OpenAI',
      openaiApiKey: OPENAI_API_KEY!,
      openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      agentTemperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.1'),
      maxTokens: parseInt(process.env.OPENAI_SESSION_MAX_TOKENS || '150'),
      cubiclerUrl: process.env.CUBICLER_URL || 'http://localhost:1504',
      agentTimeout: parseInt(process.env.AGENT_TIMEOUT || '15000'),
      agentMaxRetries: parseInt(process.env.AGENT_MAX_RETRIES || '2'),
      maxFunctionIterations: parseInt(process.env.AGENT_SESSION_MAX_ITERATION || '8'),
      logLevel: (process.env.LOG_LEVEL as any) || 'error'
    };
    
    agent = new OpenAICubicAgent(config);
  });

  afterAll(async () => {
    if (agent) {
      agent.stop();
    }
    if (mockCubicler) {
      await mockCubicler.stop();
    }
  });

  test('should respond to a simple greeting', async () => {
    const request: AgentRequest = {
      prompt: 'You are a helpful AI assistant. Respond briefly and politely.',
      messages: [
        {
          sender: 'user',
          content: 'Hello! How are you today?'
        }
      ],
      providers: []
    };

    // Mock CallContext
    const mockContext: CallContext = {
      executeFunction: vi.fn(),
      getProviderSpec: vi.fn()
    };

    const response = await agent['handleCall'](request, mockContext);
    
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(5);
    expect(response.toLowerCase()).toMatch(/hello|hi|good|fine|well|great|thank|here|ready|assist|help/);
    
    console.log('✅ ChatGPT Response:', response);
  }, 30000);

  test('should handle a simple question about AI', async () => {
    const request: AgentRequest = {
      prompt: 'You are a knowledgeable AI assistant. Answer questions accurately and concisely.',
      messages: [
        {
          sender: 'user',
          content: 'What is artificial intelligence in one sentence?'
        }
      ],
      providers: []
    };

    const mockContext: CallContext = {
      executeFunction: vi.fn(),
      getProviderSpec: vi.fn()
    };

    const response = await agent['handleCall'](request, mockContext);
    
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(10);
    expect(response.toLowerCase()).toMatch(/artificial|intelligence|ai|computer|machine|technology/);
    
    console.log('✅ AI Question Response:', response);
  }, 30000);

  test('should handle conversation context', async () => {
    const request: AgentRequest = {
      prompt: 'You are a helpful assistant. Remember what the user tells you.',
      messages: [
        {
          sender: 'user',
          content: 'My name is John and I like pizza.'
        },
        {
          sender: 'Test-CubicAgent-OpenAI',
          content: 'Nice to meet you, John! Pizza is delicious.'
        },
        {
          sender: 'user',
          content: 'What food do I like?'
        }
      ],
      providers: []
    };

    const mockContext: CallContext = {
      executeFunction: vi.fn(),
      getProviderSpec: vi.fn()
    };

    const response = await agent['handleCall'](request, mockContext);
    
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response.toLowerCase()).toMatch(/pizza/);
    
    console.log('✅ Context Response:', response);
  }, 30000);

  test('should use weather provider functions with real OpenAI', async () => {
    const request: AgentRequest = {
      prompt: 'You are a helpful weather assistant.',
      messages: [
        {
          sender: 'user',
          content: 'What is the weather like in New York?'
        }
      ],
      providers: mockProviders.filter(p => p.name === 'weather')
    };

    // Create real context that interacts with mock Cubicler
    const mockContext: CallContext = {
      executeFunction: vi.fn().mockImplementation(async (functionName: string, params: any) => {
        // Simulate calling mock Cubicler's /execute endpoint
        const response = await fetch(`${mockCubicler.getUrl()}/execute/${functionName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Function execution failed');
        }
        
        return await response.json();
      }),
      getProviderSpec: vi.fn().mockImplementation(async (providerName: string) => {
        // Simulate calling mock Cubicler's provider spec endpoint
        const response = await fetch(`${mockCubicler.getUrl()}/provider/${providerName}/spec`);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Provider spec not found');
        }
        
        return await response.json();
      })
    };

    const response = await agent['handleCall'](request, mockContext);
    
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response.toLowerCase()).toMatch(/weather|temperature|sunny|cloudy|new york/);
    
    // Verify that the context functions were called
    expect(mockContext.getProviderSpec).toHaveBeenCalledWith('weather');
    expect(mockContext.executeFunction).toHaveBeenCalledWith(
      'getWeather', 
      expect.objectContaining({ city: expect.any(String) })
    );
    
    console.log('✅ Weather Response:', response);
  }, 45000);

  test('should use calculator provider for math operations', async () => {
    const request: AgentRequest = {
      prompt: 'You are a helpful math assistant.',
      messages: [
        {
          sender: 'user',
          content: 'Calculate 25 * 4 + 10 for me please'
        }
      ],
      providers: mockProviders.filter(p => p.name === 'calculator')
    };

    const mockContext: CallContext = {
      executeFunction: vi.fn().mockImplementation(async (functionName: string, params: any) => {
        const response = await fetch(`${mockCubicler.getUrl()}/execute/${functionName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Function execution failed');
        }
        
        return await response.json();
      }),
      getProviderSpec: vi.fn().mockImplementation(async (providerName: string) => {
        const response = await fetch(`${mockCubicler.getUrl()}/provider/${providerName}/spec`);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Provider spec not found');
        }
        
        return await response.json();
      })
    };

    const response = await agent['handleCall'](request, mockContext);
    
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response).toMatch(/110/); // 25 * 4 + 10 = 110
    
    expect(mockContext.getProviderSpec).toHaveBeenCalledWith('calculator');
    // Most importantly, verify we got the correct mathematical result
    expect(response).toMatch(/110/); // 25 * 4 + 10 = 110
    
    console.log('✅ Calculator Response:', response);
  }, 45000);

  test('should handle error gracefully with invalid API key', async () => {
    const invalidConfig = {
      agentPort: 3002,
      agentName: 'Invalid-Test-Agent',
      openaiApiKey: 'invalid-key-123',
      openaiModel: 'gpt-3.5-turbo',
      agentTemperature: 0.1,
      maxTokens: 50,
      cubiclerUrl: 'http://localhost:1504',
      agentTimeout: 10000,
      agentMaxRetries: 1,
      maxFunctionIterations: 3,
      logLevel: 'error' as const
    };

    const invalidAgent = new OpenAICubicAgent(invalidConfig);

    const request: AgentRequest = {
      prompt: 'Test prompt',
      messages: [
        {
          sender: 'user',
          content: 'Hello'
        }
      ],
      providers: []
    };

    const mockContext: CallContext = {
      executeFunction: vi.fn(),
      getProviderSpec: vi.fn()
    };

    await expect(invalidAgent['handleCall'](request, mockContext))
      .rejects
      .toThrow(/OpenAI Agent Error/);

    invalidAgent.stop();
  }, 20000);
});
