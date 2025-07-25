import { jest } from '@jest/globals';
import { startAgent } from '../src/index';
import { createConfigFromEnv } from '../src/utils/env-helper';
import { OpenAICubicAgent } from '../src/openai-cubicagent';

// Mock the OpenAICubicAgent
const mockAgent = {
  start: jest.fn(),
  stop: jest.fn(),
  getCubicAgent: jest.fn(),
};

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock the OpenAICubicAgent
jest.mock('../src/openai-cubicagent', () => ({
  OpenAICubicAgent: jest.fn().mockImplementation(() => mockAgent),
}));

describe('Index - Agent Setup', () => {
  // Mock process.exit to prevent test failures
  const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit called');
  }) as any);

  beforeEach(() => {
    jest.clearAllMocks();
    mockExit.mockClear();
    // Clear environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.AGENT_PORT;
    delete process.env.AGENT_NAME;
    delete process.env.AGENT_TEMPERATURE;
    delete process.env.MAX_TOKENS;
    delete process.env.CUBICLER_URL;
    delete process.env.AGENT_TIMEOUT;
    delete process.env.AGENT_MAX_RETRIES;
    delete process.env.AGENT_SESSION_MAX_ITERATION;
    delete process.env.LOG_LEVEL;
  });

  describe('startAgent', () => {
    it('should create and start an OpenAI Cubic Agent with environment variables', async () => {
      // Set environment variables
      process.env.OPENAI_API_KEY = 'test-api-key';
      process.env.OPENAI_MODEL = 'gpt-3.5-turbo';
      process.env.AGENT_PORT = '4000';
      process.env.AGENT_NAME = 'TestAgent';
      process.env.AGENT_TEMPERATURE = '0.5';
      process.env.MAX_TOKENS = '1000';
      process.env.CUBICLER_URL = 'http://test:1234';
      process.env.AGENT_TIMEOUT = '5000';
      process.env.AGENT_MAX_RETRIES = '2';
      process.env.LOG_LEVEL = 'debug';

      await startAgent();

      expect(OpenAICubicAgent).toHaveBeenCalledWith({
        agentPort: 4000,
        agentName: 'TestAgent',
        openaiApiKey: 'test-api-key',
        openaiModel: 'gpt-3.5-turbo',
        agentTemperature: 0.5,
        maxTokens: 1000,
        cubiclerUrl: 'http://test:1234',
        agentTimeout: 5000,
        agentMaxRetries: 2,
        maxFunctionIterations: 10,
        logLevel: 'debug'
      });

      expect(mockAgent.start).toHaveBeenCalled();
    });

    it('should use default values for optional environment variables', async () => {
      // Only set required variables
      process.env.OPENAI_API_KEY = 'test-api-key';

      await startAgent();

      expect(OpenAICubicAgent).toHaveBeenCalledWith({
        agentPort: 3000,
        agentName: 'CubicAgent-OpenAI',
        openaiApiKey: 'test-api-key',
        openaiModel: 'gpt-4o',
        agentTemperature: 1,
        maxTokens: 2048,
        cubiclerUrl: 'http://localhost:1503',
        agentTimeout: 10000,
        agentMaxRetries: 3,
        maxFunctionIterations: 10,
        logLevel: 'info'
      });

      expect(mockAgent.start).toHaveBeenCalled();
    });

    it('should throw error when required environment variables are missing', async () => {
      // Don't set OPENAI_API_KEY

      await expect(startAgent()).rejects.toThrow();

      expect(OpenAICubicAgent).not.toHaveBeenCalled();
      expect(mockAgent.start).not.toHaveBeenCalled();
    });

    it('should handle AGENT_SESSION_MAX_ITERATION environment variable', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      process.env.AGENT_SESSION_MAX_ITERATION = '15';

      await startAgent();

      expect(OpenAICubicAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          maxFunctionIterations: 15
        })
      );
    });

    it('should handle invalid number values gracefully', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      process.env.AGENT_PORT = 'invalid';
      process.env.AGENT_TEMPERATURE = 'not-a-number';
      process.env.MAX_TOKENS = 'xyz';
      process.env.AGENT_TIMEOUT = 'bad';
      process.env.AGENT_MAX_RETRIES = 'invalid';
      process.env.AGENT_SESSION_MAX_ITERATION = 'wrong';

      await startAgent();

      expect(OpenAICubicAgent).toHaveBeenCalledWith({
        agentPort: 3000, // PORT defaulted since NaN becomes 3000
        agentName: 'CubicAgent-OpenAI',
        openaiApiKey: 'test-api-key',
        openaiModel: 'gpt-4o',
        agentTemperature: NaN, // parseFloat of invalid string
        maxTokens: NaN, // parseInt of invalid string
        cubiclerUrl: 'http://localhost:1503',
        agentTimeout: NaN, // parseInt of invalid string
        agentMaxRetries: NaN, // parseInt of invalid string
        maxFunctionIterations: NaN, // parseInt of invalid string
        logLevel: 'info'
      });
    });

    it('should handle edge case environment values', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      process.env.AGENT_PORT = '0';
      process.env.AGENT_TEMPERATURE = '0';
      process.env.MAX_TOKENS = '1';
      process.env.AGENT_TIMEOUT = '0';
      process.env.AGENT_MAX_RETRIES = '0';
      process.env.AGENT_SESSION_MAX_ITERATION = '1';

      await startAgent();

      expect(OpenAICubicAgent).toHaveBeenCalledWith({
        agentPort: 3000, // PORT defaulted since 0 is treated as falsy
        agentName: 'CubicAgent-OpenAI',
        openaiApiKey: 'test-api-key',
        openaiModel: 'gpt-4o',
        agentTemperature: 0,
        maxTokens: 1,
        cubiclerUrl: 'http://localhost:1503',
        agentTimeout: 0,
        agentMaxRetries: 0,
        maxFunctionIterations: 1,
        logLevel: 'info'
      });
    });

    it('should handle empty string environment variables', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      process.env.OPENAI_MODEL = '';
      process.env.AGENT_NAME = '';
      process.env.CUBICLER_URL = '';
      process.env.LOG_LEVEL = '';

      await startAgent();

      expect(OpenAICubicAgent).toHaveBeenCalledWith({
        agentPort: 3000,
        agentName: 'CubicAgent-OpenAI', // falls back to default
        openaiApiKey: 'test-api-key',
        openaiModel: 'gpt-4o', // falls back to default
        agentTemperature: 1,
        maxTokens: 2048,
        cubiclerUrl: 'http://localhost:1503', // falls back to default
        agentTimeout: 10000,
        agentMaxRetries: 3,
        maxFunctionIterations: 10,
        logLevel: 'info' // falls back to default
      });
    });

    it('should handle different log levels', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      const logLevels = ['debug', 'info', 'warn', 'error'];
      
      for (const level of logLevels) {
        jest.clearAllMocks();
        process.env.LOG_LEVEL = level;
        
        await startAgent();
        
        expect(OpenAICubicAgent).toHaveBeenCalledWith(
          expect.objectContaining({
            logLevel: level
          })
        );
      }
    });

    it('should handle invalid log level', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      process.env.LOG_LEVEL = 'invalid';

      await startAgent();

      expect(OpenAICubicAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          logLevel: 'invalid' // Invalid log level should be passed through, not fallback to default
        })
      );
    });
  });

  describe('configuration validation', () => {
    it('should validate required OPENAI_API_KEY', () => {
      // Test with undefined
      delete process.env.OPENAI_API_KEY;
      expect(() => createConfigFromEnv()).toThrow('Missing required environment variables: OPENAI_API_KEY');

      // Test with empty string
      process.env.OPENAI_API_KEY = '';
      expect(() => createConfigFromEnv()).toThrow('Missing required environment variables: OPENAI_API_KEY');

      // Test with whitespace only
      process.env.OPENAI_API_KEY = '   ';
      expect(() => createConfigFromEnv()).toThrow('Missing required environment variables: OPENAI_API_KEY');
    });

    it('should accept valid OPENAI_API_KEY formats', async () => {
      const validKeys = [
        'sk-1234567890abcdef',
        'sk-proj-abcdef1234567890',
        'test-key-for-development'
      ];

      for (const key of validKeys) {
        jest.clearAllMocks();
        process.env.OPENAI_API_KEY = key;
        
        await startAgent();
        
        expect(OpenAICubicAgent).toHaveBeenCalledWith(
          expect.objectContaining({
            openaiApiKey: key
          })
        );
      }
    });
  });

  describe('agent lifecycle', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key';
    });

    it('should return the created agent instance', async () => {
      const agent = await startAgent();
      expect(agent).toBe(mockAgent);
    });

    it('should call agent.start() during startup', async () => {
      await startAgent();
      expect(mockAgent.start).toHaveBeenCalledTimes(1);
    });

    it('should handle agent startup errors', async () => {
      const startupError = new Error('Failed to start agent');
      mockAgent.start.mockImplementation(() => {
        throw startupError;
      });

      await expect(startAgent()).rejects.toThrow();
    });

    it('should handle OpenAICubicAgent constructor errors', async () => {
      const constructorError = new Error('Invalid configuration');
      (OpenAICubicAgent as jest.Mock).mockImplementation(() => {
        throw constructorError;
      });

      await expect(startAgent()).rejects.toThrow();
    });
  });
});
