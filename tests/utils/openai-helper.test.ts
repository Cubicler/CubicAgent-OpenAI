import { describe, it, expect } from 'vitest';
import { 
  convertToOpenAIMessages,
  createGetProviderSpecFunction,
  convertAgentFunctionsToOpenAI
} from '../../src/utils/openai-helper';
import type { AgentRequest, AgentFunctionDefinition } from '@cubicler/cubicagentkit';

describe('OpenAI Helper Utilities', () => {
  describe('convertToOpenAIMessages', () => {
    it('should convert basic request to OpenAI messages format', () => {
      const request: AgentRequest = {
        prompt: 'You are a helpful assistant',
        messages: [
          { sender: 'user', content: 'Hello there' },
          { sender: 'TestAgent', content: 'Hello! How can I help?' }
        ],
        providers: []
      };

      const result = convertToOpenAIMessages(request, 'TestAgent');

      expect(result).toHaveLength(3); // system + 2 messages
      expect(result[0]).toEqual({
        role: 'system',
        content: expect.stringContaining('You are a helpful assistant')
      });
      expect(result[1]).toEqual({
        role: 'user',
        content: '[user]: Hello there'
      });
      expect(result[2]).toEqual({
        role: 'assistant',
        content: '[me]: Hello! How can I help?'
      });
    });

    it('should include provider information in system prompt', () => {
      const request: AgentRequest = {
        prompt: 'You are a helpful assistant',
        messages: [],
        providers: [
          { name: 'weather', description: 'Provides weather information' },
          { name: 'calendar', description: 'Manages calendar events' }
        ]
      };

      const result = convertToOpenAIMessages(request, 'TestAgent');

      const systemMessage = result[0];
      expect(systemMessage.content).toContain('AVAILABLE PROVIDERS');
      expect(systemMessage.content).toContain('weather: Provides weather information');
      expect(systemMessage.content).toContain('calendar: Manages calendar events');
      expect(systemMessage.content).toContain('use the getProviderSpec function');
    });

    it('should format messages with sender display', () => {
      const request: AgentRequest = {
        prompt: 'Test prompt',
        messages: [
          { sender: 'alice', content: 'Hi from Alice' },
          { sender: 'TestAgent', content: 'Response from agent' },
          { sender: 'bob', content: 'Hi from Bob' }
        ],
        providers: []
      };

      const result = convertToOpenAIMessages(request, 'TestAgent');

      expect(result[1].content).toBe('[alice]: Hi from Alice');
      expect(result[2].content).toBe('[me]: Response from agent');
      expect(result[3].content).toBe('[bob]: Hi from Bob');
    });

    it('should include iteration tracking in system prompt when provided', () => {
      const request: AgentRequest = {
        prompt: 'You are a helpful assistant',
        messages: [],
        providers: []
      };

      const result = convertToOpenAIMessages(request, 'TestAgent', 5, 10);

      expect(result).toHaveLength(1); // just system message
      expect(result[0]).toEqual({
        role: 'system',
        content: expect.stringContaining('FUNCTION CALLING STATUS: You are currently in iteration 5/10 of function calling')
      });
      expect(result[0].content).toContain('be mindful of the remaining iterations');
    });

    it('should not include iteration tracking when not provided', () => {
      const request: AgentRequest = {
        prompt: 'You are a helpful assistant',
        messages: [],
        providers: []
      };

      const result = convertToOpenAIMessages(request, 'TestAgent');

      expect(result[0].content).not.toContain('FUNCTION CALLING STATUS');
      expect(result[0].content).not.toContain('iteration');
    });
  });

  describe('createGetProviderSpecFunction', () => {
    it('should create getProviderSpec function definition', () => {
      const providers = ['weather', 'calendar'];
      const result = createGetProviderSpecFunction(providers);

      expect(result).toEqual({
        type: 'function',
        function: {
          name: 'getProviderSpec',
          description: 'Get detailed specification and available functions for a provider',
          parameters: {
            type: 'object',
            properties: {
              providerName: {
                type: 'string',
                description: 'Name of the provider to get specification for',
                enum: ['weather', 'calendar']
              }
            },
            required: ['providerName']
          }
        }
      });
    });

    it('should handle empty provider list', () => {
      const result = createGetProviderSpecFunction([]);

      expect(result.function.parameters).toBeDefined();
      const params = result.function.parameters as { properties: { providerName: { enum: string[] } } };
      expect(params.properties.providerName.enum).toEqual([]);
    });
  });

  describe('convertAgentFunctionsToOpenAI', () => {
    it('should convert agent functions to OpenAI format', () => {
      const functions: AgentFunctionDefinition[] = [
        {
          name: 'getCurrentWeather',
          description: 'Get current weather',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', required: true }
            },
            required: ['location']
          }
        },
        {
          name: 'getTime',
          description: 'Get current time',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      ];

      const result = convertAgentFunctionsToOpenAI(functions);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'function',
        function: {
          name: 'getCurrentWeather',
          description: 'Get current weather',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', required: true }
            },
            required: ['location']
          }
        }
      });
      expect(result[1]).toEqual({
        type: 'function',
        function: {
          name: 'getTime',
          description: 'Get current time',
          parameters: { type: 'object', properties: {} }
        }
      });
    });

    it('should handle empty function list', () => {
      const result = convertAgentFunctionsToOpenAI([]);
      expect(result).toEqual([]);
    });
  });
});
