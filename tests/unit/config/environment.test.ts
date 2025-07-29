import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig, openAIConfigSchema, dispatchConfigSchema, configSchema } from '../../../src/config/environment.js';

describe('Environment Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_TEMPERATURE;
    delete process.env.OPENAI_SESSION_MAX_TOKENS;
    delete process.env.OPENAI_ORG_ID;
    delete process.env.OPENAI_PROJECT_ID;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_TIMEOUT;
    delete process.env.OPENAI_MAX_RETRIES;
    delete process.env.DISPATCH_TIMEOUT;
    delete process.env.MCP_MAX_RETRIES;
    delete process.env.MCP_CALL_TIMEOUT;
    delete process.env.DISPATCH_SESSION_MAX_ITERATION;
    delete process.env.DISPATCH_ENDPOINT;
    delete process.env.AGENT_PORT;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('openAIConfigSchema', () => {
    it('should validate valid OpenAI configuration', () => {
      const validConfig = {
        apiKey: 'sk-test-api-key',
        model: 'gpt-4o' as const,
        temperature: 0.7,
        sessionMaxTokens: 4096,
        organization: 'org-test',
        project: 'proj_test',
        baseURL: 'https://api.openai.com/v1',
        timeout: 60000,
        maxRetries: 2
      };

      const result = openAIConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply default values for optional fields', () => {
      const minimalConfig = {
        apiKey: 'sk-test-api-key'
      };

      const result = openAIConfigSchema.parse(minimalConfig);
      expect(result.model).toBe('gpt-4o');
      expect(result.temperature).toBe(0.7);
      expect(result.sessionMaxTokens).toBe(4096);
      expect(result.timeout).toBe(600000);
      expect(result.maxRetries).toBe(2);
    });

    it('should reject invalid API key', () => {
      const invalidConfig = {
        apiKey: ''
      };

      expect(() => openAIConfigSchema.parse(invalidConfig)).toThrow('OpenAI API key is required');
    });

    it('should reject invalid model', () => {
      const invalidConfig = {
        apiKey: 'sk-test-api-key',
        model: 'invalid-model' as any
      };

      expect(() => openAIConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject invalid temperature range', () => {
      const invalidConfig = {
        apiKey: 'sk-test-api-key',
        temperature: 2.5
      };

      expect(() => openAIConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject negative sessionMaxTokens', () => {
      const invalidConfig = {
        apiKey: 'sk-test-api-key',
        sessionMaxTokens: -100
      };

      expect(() => openAIConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject invalid baseURL format', () => {
      const invalidConfig = {
        apiKey: 'sk-test-api-key',
        baseURL: 'not-a-url'
      };

      expect(() => openAIConfigSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('dispatchConfigSchema', () => {
    it('should validate valid dispatch configuration', () => {
      const validConfig = {
        timeout: 30000,
        mcpMaxRetries: 3,
        mcpCallTimeout: 10000,
        sessionMaxIteration: 10,
        endpoint: '/',
        agentPort: 3000
      };

      const result = dispatchConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply default values', () => {
      const result = dispatchConfigSchema.parse({});
      expect(result.timeout).toBe(30000);
      expect(result.mcpMaxRetries).toBe(3);
      expect(result.mcpCallTimeout).toBe(10000);
      expect(result.sessionMaxIteration).toBe(10);
      expect(result.endpoint).toBe('/');
      expect(result.agentPort).toBe(3000);
    });

    it('should reject negative timeout', () => {
      const invalidConfig = {
        timeout: -1000
      };

      expect(() => dispatchConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject negative mcpMaxRetries', () => {
      const invalidConfig = {
        mcpMaxRetries: -1
      };

      expect(() => dispatchConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject negative sessionMaxIteration', () => {
      const invalidConfig = {
        sessionMaxIteration: 0
      };

      expect(() => dispatchConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject negative agentPort', () => {
      const invalidConfig = {
        agentPort: -3000
      };

      expect(() => dispatchConfigSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('configSchema', () => {
    it('should validate complete configuration', () => {
      const validConfig = {
        openai: {
          apiKey: 'sk-test-api-key',
          model: 'gpt-4o' as const,
          temperature: 0.8,
          sessionMaxTokens: 2048,
          timeout: 600000,
          maxRetries: 2
        },
        dispatch: {
          timeout: 25000,
          mcpMaxRetries: 5,
          mcpCallTimeout: 8000,
          sessionMaxIteration: 15,
          endpoint: '/agent',
          agentPort: 4000
        }
      };

      const result = configSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should reject configuration with missing openai section', () => {
      const invalidConfig = {
        dispatch: {
          timeout: 30000,
          mcpMaxRetries: 3,
          mcpCallTimeout: 10000,
          sessionMaxIteration: 10,
          endpoint: '/',
          agentPort: 3000
        }
      };

      expect(() => configSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject configuration with missing dispatch section', () => {
      const invalidConfig = {
        openai: {
          apiKey: 'sk-test-api-key'
        }
      };

      expect(() => configSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('loadConfig', () => {
    it('should load configuration from environment variables', () => {
      // Set required environment variables
      process.env.OPENAI_API_KEY = 'sk-test-api-key';
      process.env.OPENAI_MODEL = 'gpt-4';
      process.env.OPENAI_TEMPERATURE = '0.8';
      process.env.OPENAI_SESSION_MAX_TOKENS = '2048';
      process.env.OPENAI_ORG_ID = 'org-test';
      process.env.OPENAI_PROJECT_ID = 'proj_test';
      process.env.OPENAI_BASE_URL = 'https://custom.openai.com/v1';
      process.env.OPENAI_TIMEOUT = '120000';
      process.env.OPENAI_MAX_RETRIES = '5';
      process.env.DISPATCH_TIMEOUT = '25000';
      process.env.MCP_MAX_RETRIES = '5';
      process.env.MCP_CALL_TIMEOUT = '8000';
      process.env.DISPATCH_SESSION_MAX_ITERATION = '15';
      process.env.DISPATCH_ENDPOINT = '/custom';
      process.env.AGENT_PORT = '4000';

      const result = loadConfig();

      expect(result.openai.apiKey).toBe('sk-test-api-key');
      expect(result.openai.model).toBe('gpt-4');
      expect(result.openai.temperature).toBe(0.8);
      expect(result.openai.sessionMaxTokens).toBe(2048);
      expect(result.openai.organization).toBe('org-test');
      expect(result.openai.project).toBe('proj_test');
      expect(result.openai.baseURL).toBe('https://custom.openai.com/v1');
      expect(result.openai.timeout).toBe(120000);
      expect(result.openai.maxRetries).toBe(5);
      expect(result.dispatch.timeout).toBe(25000);
      expect(result.dispatch.mcpMaxRetries).toBe(5);
      expect(result.dispatch.mcpCallTimeout).toBe(8000);
      expect(result.dispatch.sessionMaxIteration).toBe(15);
      expect(result.dispatch.endpoint).toBe('/custom');
      expect(result.dispatch.agentPort).toBe(4000);
    });

    it('should use default values when environment variables are not set', () => {
      // Only set required API key
      process.env.OPENAI_API_KEY = 'sk-test-api-key';

      const result = loadConfig();

      expect(result.openai.model).toBe('gpt-4o');
      expect(result.openai.temperature).toBe(0.7);
      expect(result.openai.sessionMaxTokens).toBe(4096);
      expect(result.openai.timeout).toBe(600000);
      expect(result.openai.maxRetries).toBe(2);
      expect(result.dispatch.timeout).toBe(30000);
      expect(result.dispatch.mcpMaxRetries).toBe(3);
      expect(result.dispatch.mcpCallTimeout).toBe(10000);
      expect(result.dispatch.sessionMaxIteration).toBe(10);
      expect(result.dispatch.endpoint).toBe('/');
      expect(result.dispatch.agentPort).toBe(3000);
    });

    it('should handle optional environment variables as undefined', () => {
      process.env.OPENAI_API_KEY = 'sk-test-api-key';
      // Don't set optional org and project variables

      const result = loadConfig();

      expect(result.openai.organization).toBeUndefined();
      expect(result.openai.project).toBeUndefined();
      expect(result.openai.baseURL).toBeUndefined();
    });

    it('should throw validation error for missing API key', () => {
      // Don't set OPENAI_API_KEY
      expect(() => loadConfig()).toThrow('OpenAI API key is required');
    });

    it('should throw validation error for invalid model', () => {
      process.env.OPENAI_API_KEY = 'sk-test-api-key';
      process.env.OPENAI_MODEL = 'invalid-model';

      expect(() => loadConfig()).toThrow();
    });

    it('should throw validation error for invalid temperature', () => {
      process.env.OPENAI_API_KEY = 'sk-test-api-key';
      process.env.OPENAI_TEMPERATURE = '5.0'; // Too high

      expect(() => loadConfig()).toThrow();
    });

    it('should throw validation error for invalid numeric values', () => {
      process.env.OPENAI_API_KEY = 'sk-test-api-key';
      process.env.OPENAI_SESSION_MAX_TOKENS = 'not-a-number';

      expect(() => loadConfig()).toThrow();
    });

    it('should handle string "undefined" as undefined for optional fields', () => {
      process.env.OPENAI_API_KEY = 'sk-test-api-key';
      process.env.OPENAI_ORG_ID = '';
      process.env.OPENAI_PROJECT_ID = '';
      process.env.OPENAI_BASE_URL = '';

      const result = loadConfig();

      expect(result.openai.organization).toBeUndefined();
      expect(result.openai.project).toBeUndefined();
      expect(result.openai.baseURL).toBeUndefined();
    });

    it('should parse numeric environment variables correctly', () => {
      process.env.OPENAI_API_KEY = 'sk-test-api-key';
      process.env.OPENAI_TEMPERATURE = '0.9';
      process.env.OPENAI_SESSION_MAX_TOKENS = '8192';
      process.env.OPENAI_TIMEOUT = '300000';
      process.env.OPENAI_MAX_RETRIES = '1';
      process.env.DISPATCH_TIMEOUT = '45000';
      process.env.MCP_MAX_RETRIES = '2';
      process.env.MCP_CALL_TIMEOUT = '15000';
      process.env.DISPATCH_SESSION_MAX_ITERATION = '20';
      process.env.AGENT_PORT = '8080';

      const result = loadConfig();

      expect(typeof result.openai.temperature).toBe('number');
      expect(typeof result.openai.sessionMaxTokens).toBe('number');
      expect(typeof result.openai.timeout).toBe('number');
      expect(typeof result.openai.maxRetries).toBe('number');
      expect(typeof result.dispatch.timeout).toBe('number');
      expect(typeof result.dispatch.mcpMaxRetries).toBe('number');
      expect(typeof result.dispatch.mcpCallTimeout).toBe('number');
      expect(typeof result.dispatch.sessionMaxIteration).toBe('number');
      expect(typeof result.dispatch.agentPort).toBe('number');
    });
  });
});
