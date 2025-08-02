import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { buildOpenAIMessages, buildSystemMessage, cleanFinalResponse } from '../../../src/utils/message-helper.js';
import type { AgentRequest } from '@cubicler/cubicagentkit';
import type { OpenAIConfig, DispatchConfig } from '../../../src/config/environment.js';

describe('MessageHelper', () => {
  let mockOpenAIConfig: OpenAIConfig;
  let mockDispatchConfig: DispatchConfig;
  let mockConsoleLog: Mock;

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
        content: 'Hello, how are you?'
      },
      {
        type: 'text',
        sender: { id: 'test-agent', name: 'Test Agent' },
        content: 'I am doing well, thank you!'
      },
      {
        type: 'text',
        sender: { id: 'user-2', name: 'Another User' },
        content: 'What can you help me with?'
      }
    ],
    tools: [
      {
        name: 'cubicler_availableServers',
        description: 'Get available servers',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ],
    servers: []
  });

  beforeEach(() => {
    // Mock console.log
    mockConsoleLog = vi.fn();
    vi.stubGlobal('console', {
      log: mockConsoleLog
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
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('buildOpenAIMessages', () => {
    it('should convert AgentRequest messages to OpenAI format', () => {
      const request = createMockAgentRequest();
      const result = buildOpenAIMessages(request, mockOpenAIConfig, mockDispatchConfig, 1);

      expect(result).toHaveLength(4); // 1 system + 3 user/assistant messages
      expect(result[0].role).toBe('system');
      expect(result[1].role).toBe('user');
      expect(result[2].role).toBe('assistant');
      expect(result[3].role).toBe('user');
    });

    it('should include system message as first message', () => {
      const request = createMockAgentRequest();
      const result = buildOpenAIMessages(request, mockOpenAIConfig, mockDispatchConfig, 1);

      expect(result[0].role).toBe('system');
      expect(result[0].content).toContain('IMPORTANT: Messages from users will be in JSON format');
      expect(result[0].content).toContain('iteration 1 of 10');
    });

    it('should format user messages with sender information as JSON', () => {
      const request = createMockAgentRequest();
      const result = buildOpenAIMessages(request, mockOpenAIConfig, mockDispatchConfig, 1);

      const userMessage = result[1];
      expect(userMessage.role).toBe('user');
      
      const parsedContent = JSON.parse(userMessage.content as string);
      expect(parsedContent.senderId).toBe('user-1');
      expect(parsedContent.name).toBe('Test User');
      expect(parsedContent.content).toBe('Hello, how are you?');
    });

    it('should handle assistant messages from the agent', () => {
      const request = createMockAgentRequest();
      const result = buildOpenAIMessages(request, mockOpenAIConfig, mockDispatchConfig, 1);

      const assistantMessage = result[2];
      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.content).toBe('I am doing well, thank you!');
    });

    it('should skip messages with null content', () => {
      const request = createMockAgentRequest();
      request.messages.push({
        type: 'text',
        sender: { id: 'user-3', name: 'User 3' },
        content: null
      });

      const result = buildOpenAIMessages(request, mockOpenAIConfig, mockDispatchConfig, 1);

      // Should still be 4 messages (system + 3 original messages, null content message skipped)
      expect(result).toHaveLength(4);
    });

    it('should handle messages from unknown senders', () => {
      const request = createMockAgentRequest();
      request.messages[0].sender.name = undefined;

      const result = buildOpenAIMessages(request, mockOpenAIConfig, mockDispatchConfig, 1);

      const userMessage = result[1];
      const parsedContent = JSON.parse(userMessage.content as string);
      expect(parsedContent.name).toBe('Unknown');
    });
  });

  describe('buildSystemMessage', () => {
    it('should include agent prompt from Cubicler dispatch', () => {
      const request = createMockAgentRequest();
      const result = buildSystemMessage(request, mockOpenAIConfig, mockDispatchConfig, 1);

      expect(result).toContain('You are a test agent for unit testing purposes.');
    });

    it('should include message format instructions', () => {
      const request = createMockAgentRequest();
      const result = buildSystemMessage(request, mockOpenAIConfig, mockDispatchConfig, 1);

      expect(result).toContain('IMPORTANT: Messages from users will be in JSON format');
      expect(result).toContain('senderId');
      expect(result).toContain('name');
      expect(result).toContain('content');
    });

    it('should include iteration context', () => {
      const request = createMockAgentRequest();
      const result = buildSystemMessage(request, mockOpenAIConfig, mockDispatchConfig, 3);

      expect(result).toContain('This is iteration 3 of 10');
    });

    it('should include token limit information', () => {
      const request = createMockAgentRequest();
      const result = buildSystemMessage(request, mockOpenAIConfig, mockDispatchConfig, 1);

      expect(result).toContain('You have a maximum of 4096 tokens');
    });

    it('should include tool usage guidance when tools are available', () => {
      const request = createMockAgentRequest();
      const result = buildSystemMessage(request, mockOpenAIConfig, mockDispatchConfig, 2);

      expect(result).toContain('You have 8 remaining iterations to make tool calls');
    });

    it('should not include tool usage guidance when no tools are available', () => {
      const request = createMockAgentRequest();
      request.tools = [];
      
      const result = buildSystemMessage(request, mockOpenAIConfig, mockDispatchConfig, 2);

      expect(result).not.toContain('remaining iterations to make tool calls');
    });

    it('should handle last iteration correctly', () => {
      const request = createMockAgentRequest();
      const result = buildSystemMessage(request, mockOpenAIConfig, mockDispatchConfig, 10);

      expect(result).toContain('This is iteration 10 of 10');
      expect(result).toContain('You have 0 remaining iterations');
    });

    it('should handle missing agent prompt gracefully', () => {
      const request = createMockAgentRequest();
      // Create a request without a prompt by omitting it
      request.agent = {
        ...request.agent,
        prompt: undefined as any  // Type assertion to test the undefined case
      };
      
      const result = buildSystemMessage(request, mockOpenAIConfig, mockDispatchConfig, 1);

      // Should still include the format instructions even without agent prompt
      expect(result).toContain('IMPORTANT: Messages from users will be in JSON format');
      expect(result).toContain('This is iteration 1 of 10');
    });
  });

  describe('cleanFinalResponse', () => {
    it('should return plain text content as-is', () => {
      const content = 'This is a plain text response';
      const result = cleanFinalResponse(content);

      expect(result).toBe(content);
      expect(mockConsoleLog).toHaveBeenCalledWith('Response is not JSON, returning as plain text');
    });

    it('should extract content from JSON response with content field', () => {
      const jsonContent = JSON.stringify({
        content: 'This is the extracted content',
        other: 'field'
      });
      
      const result = cleanFinalResponse(jsonContent);

      expect(result).toBe('This is the extracted content');
      expect(mockConsoleLog).toHaveBeenCalledWith('Extracted content from JSON response:', {
        originalLength: jsonContent.length,
        extractedLength: 'This is the extracted content'.length,
        wasJSON: true
      });
    });

    it('should return original JSON when no content field exists', () => {
      const jsonContent = JSON.stringify({
        message: 'This is a message',
        data: 'some data'
      });
      
      const result = cleanFinalResponse(jsonContent);

      expect(result).toBe(jsonContent);
      expect(mockConsoleLog).toHaveBeenCalledWith('JSON response without content field, returning original');
    });

    it('should handle null content', () => {
      const result = cleanFinalResponse(null);

      expect(result).toBe('No response from OpenAI');
    });

    it('should handle empty string content', () => {
      const result = cleanFinalResponse('');

      expect(result).toBe('No response from OpenAI');
    });

    it('should handle non-string content in JSON content field', () => {
      const jsonContent = JSON.stringify({
        content: 123,
        other: 'field'
      });
      
      const result = cleanFinalResponse(jsonContent);

      // Should return original content when content field is not a string
      expect(result).toBe(jsonContent);
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = '{ invalid json }';
      const result = cleanFinalResponse(invalidJson);

      expect(result).toBe(invalidJson);
      expect(mockConsoleLog).toHaveBeenCalledWith('Response is not JSON, returning as plain text');
    });

    it('should handle JSON with null content field', () => {
      const jsonContent = JSON.stringify({
        content: null,
        other: 'field'
      });
      
      const result = cleanFinalResponse(jsonContent);

      // Should return original when content field is null
      expect(result).toBe(jsonContent);
    });

    it('should handle nested JSON in content field', () => {
      const nestedContent = JSON.stringify({ nested: 'data' });
      const jsonContent = JSON.stringify({
        content: nestedContent,
        other: 'field'
      });
      
      const result = cleanFinalResponse(jsonContent);

      expect(result).toBe(nestedContent);
    });
  });
});
