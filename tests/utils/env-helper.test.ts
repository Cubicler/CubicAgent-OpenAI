import { createConfigFromEnv } from '../../src/utils/env-helper.js';

describe('env-helper', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear all environment variables we care about
    delete process.env.OPENAI_API_KEY;
    delete process.env.AGENT_PORT;
    delete process.env.AGENT_NAME;
    delete process.env.OPENAI_MODEL;
    delete process.env.AGENT_TEMPERATURE;
    delete process.env.MAX_TOKENS;
    delete process.env.CUBICLER_URL;
    delete process.env.AGENT_TIMEOUT;
    delete process.env.AGENT_MAX_RETRIES;
    delete process.env.AGENT_SESSION_MAX_ITERATION;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createConfigFromEnv', () => {
    it('should create config with default values when only required env vars are set', () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      const config = createConfigFromEnv();

      expect(config).toEqual({
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
    });

    it('should use custom values when environment variables are provided', () => {
      process.env.OPENAI_API_KEY = 'custom-api-key';
      process.env.AGENT_PORT = '8080';
      process.env.AGENT_NAME = 'CustomAgent';
      process.env.OPENAI_MODEL = 'gpt-3.5-turbo';
      process.env.AGENT_TEMPERATURE = '0.5';
      process.env.MAX_TOKENS = '1024';
      process.env.CUBICLER_URL = 'http://custom-host:9000';
      process.env.AGENT_TIMEOUT = '5000';
      process.env.AGENT_MAX_RETRIES = '5';
      process.env.AGENT_SESSION_MAX_ITERATION = '15';
      process.env.LOG_LEVEL = 'debug';

      const config = createConfigFromEnv();

      expect(config).toEqual({
        agentPort: 8080,
        agentName: 'CustomAgent',
        openaiApiKey: 'custom-api-key',
        openaiModel: 'gpt-3.5-turbo',
        agentTemperature: 0.5,
        maxTokens: 1024,
        cubiclerUrl: 'http://custom-host:9000',
        agentTimeout: 5000,
        agentMaxRetries: 5,
        maxFunctionIterations: 15,
        logLevel: 'debug'
      });
    });

    it('should handle different log levels', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      const logLevels = ['debug', 'info', 'warn', 'error'] as const;
      
      for (const level of logLevels) {
        process.env.LOG_LEVEL = level;
        const config = createConfigFromEnv();
        expect(config.logLevel).toBe(level);
      }
    });

    it('should accept any log level value (no validation)', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.LOG_LEVEL = 'invalid-level';

      const config = createConfigFromEnv();

      // The implementation casts without validation
      expect(config.logLevel).toBe('invalid-level');
    });

    it('should handle numeric parsing correctly', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.AGENT_PORT = '3001';
      process.env.AGENT_TEMPERATURE = '0.7';
      process.env.MAX_TOKENS = '1500';
      process.env.AGENT_TIMEOUT = '8000';
      process.env.AGENT_MAX_RETRIES = '2';
      process.env.AGENT_SESSION_MAX_ITERATION = '20';

      const config = createConfigFromEnv();

      expect(config.agentPort).toBe(3001);
      expect(config.agentTemperature).toBe(0.7);
      expect(config.maxTokens).toBe(1500);
      expect(config.agentTimeout).toBe(8000);
      expect(config.agentMaxRetries).toBe(2);
      expect(config.maxFunctionIterations).toBe(20);
    });

    it('should use invalid values when environment variables are set but invalid', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.AGENT_PORT = 'invalid';
      process.env.AGENT_TEMPERATURE = 'not-a-number';
      process.env.MAX_TOKENS = 'abc';
      process.env.AGENT_TIMEOUT = 'xyz';
      process.env.AGENT_MAX_RETRIES = 'def';
      process.env.AGENT_SESSION_MAX_ITERATION = 'ghi';

      const config = createConfigFromEnv();

      // Number('invalid') returns NaN, NaN || 3000 = 3000
      expect(config.agentPort).toBe(3000);
      // parseFloat('not-a-number') returns NaN
      expect(config.agentTemperature).toBeNaN();
      // parseInt('abc') returns NaN because 'abc' is passed to parseInt
      expect(config.maxTokens).toBeNaN();
      // parseInt('xyz') returns NaN because 'xyz' is passed to parseInt
      expect(config.agentTimeout).toBeNaN();
      // parseInt('def') returns NaN because 'def' is passed to parseInt
      expect(config.agentMaxRetries).toBeNaN();
      // parseInt('ghi') returns NaN because 'ghi' is passed to parseInt
      expect(config.maxFunctionIterations).toBeNaN();
    });

    describe('required environment variables validation', () => {
      it('should throw error when OPENAI_API_KEY is missing', () => {
        expect(() => createConfigFromEnv()).toThrow(
          'Missing required environment variables: OPENAI_API_KEY'
        );
      });

      it('should throw error when OPENAI_API_KEY is empty string', () => {
        process.env.OPENAI_API_KEY = '';

        expect(() => createConfigFromEnv()).toThrow(
          'Missing required environment variables: OPENAI_API_KEY'
        );
      });

      it('should throw error when OPENAI_API_KEY is only whitespace', () => {
        process.env.OPENAI_API_KEY = '   ';

        expect(() => createConfigFromEnv()).toThrow(
          'Missing required environment variables: OPENAI_API_KEY'
        );
      });

      it('should throw error when OPENAI_API_KEY is only tabs and newlines', () => {
        process.env.OPENAI_API_KEY = '\t\n\r ';

        expect(() => createConfigFromEnv()).toThrow(
          'Missing required environment variables: OPENAI_API_KEY'
        );
      });

      it('should accept OPENAI_API_KEY with leading/trailing whitespace but valid content', () => {
        process.env.OPENAI_API_KEY = '  valid-key  ';

        const config = createConfigFromEnv();

        expect(config.openaiApiKey).toBe('  valid-key  ');
      });
    });

    describe('edge cases', () => {
      it('should handle zero values correctly', () => {
        process.env.OPENAI_API_KEY = 'test-key';
        process.env.AGENT_PORT = '0';
        process.env.AGENT_TEMPERATURE = '0';
        process.env.MAX_TOKENS = '0';
        process.env.AGENT_TIMEOUT = '0';
        process.env.AGENT_MAX_RETRIES = '0';
        process.env.AGENT_SESSION_MAX_ITERATION = '0';

        const config = createConfigFromEnv();

        expect(config.agentPort).toBe(3000); // Number('0') = 0, 0 || 3000 = 3000
        expect(config.agentTemperature).toBe(0); // parseFloat('0') = 0
        expect(config.maxTokens).toBe(0); // parseInt('0') = 0
        expect(config.agentTimeout).toBe(0); // parseInt('0') = 0
        expect(config.agentMaxRetries).toBe(0); // parseInt('0') = 0
        expect(config.maxFunctionIterations).toBe(0); // parseInt('0') = 0
      });

      it('should handle negative values', () => {
        process.env.OPENAI_API_KEY = 'test-key';
        process.env.AGENT_PORT = '-1';
        process.env.AGENT_TEMPERATURE = '-0.5';
        process.env.MAX_TOKENS = '-100';
        process.env.AGENT_TIMEOUT = '-5000';
        process.env.AGENT_MAX_RETRIES = '-2';
        process.env.AGENT_SESSION_MAX_ITERATION = '-5';

        const config = createConfigFromEnv();

        expect(config.agentPort).toBe(-1);
        expect(config.agentTemperature).toBe(-0.5);
        expect(config.maxTokens).toBe(-100);
        expect(config.agentTimeout).toBe(-5000);
        expect(config.agentMaxRetries).toBe(-2);
        expect(config.maxFunctionIterations).toBe(-5);
      });

      it('should handle floating point values for integer fields', () => {
        process.env.OPENAI_API_KEY = 'test-key';
        process.env.AGENT_PORT = '3000.7';
        process.env.MAX_TOKENS = '2048.9';
        process.env.AGENT_TIMEOUT = '10000.5';
        process.env.AGENT_MAX_RETRIES = '3.2';
        process.env.AGENT_SESSION_MAX_ITERATION = '10.8';

        const config = createConfigFromEnv();

        expect(config.agentPort).toBe(3000.7); // Number() preserves decimal
        expect(config.maxTokens).toBe(2048); // parseInt() truncates decimal
        expect(config.agentTimeout).toBe(10000); // parseInt() truncates decimal
        expect(config.agentMaxRetries).toBe(3); // parseInt() truncates decimal
        expect(config.maxFunctionIterations).toBe(10); // parseInt() truncates decimal
      });

      it('should handle very large numbers', () => {
        process.env.OPENAI_API_KEY = 'test-key';
        process.env.AGENT_PORT = '999999';
        process.env.AGENT_TEMPERATURE = '100.5';
        process.env.MAX_TOKENS = '1000000';
        process.env.AGENT_TIMEOUT = '999999999';
        process.env.AGENT_MAX_RETRIES = '1000';
        process.env.AGENT_SESSION_MAX_ITERATION = '10000';

        const config = createConfigFromEnv();

        expect(config.agentPort).toBe(999999);
        expect(config.agentTemperature).toBe(100.5);
        expect(config.maxTokens).toBe(1000000);
        expect(config.agentTimeout).toBe(999999999);
        expect(config.agentMaxRetries).toBe(1000);
        expect(config.maxFunctionIterations).toBe(10000);
      });
    });
  });
});
