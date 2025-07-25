import type { AgentRequest, AgentFunctionDefinition } from '@cubicler/cubicagentkit';
import OpenAI from 'openai';

/**
 * OpenAI Helper Utilities
 * Utility functions for OpenAI integration with CubicAgent
 */

/**
 * Converts Cubicler messages to OpenAI chat format with enhanced formatting
 */
export function convertToOpenAIMessages(
  request: AgentRequest, 
  agentName: string,
  currentIteration?: number,
  maxIterations?: number
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  // Build system prompt with context about message format and available providers
  let systemPrompt = request.prompt || '';
  
  // Add iteration tracking information if provided
  if (currentIteration !== undefined && maxIterations !== undefined) {
    systemPrompt += `\n\nFUNCTION CALLING STATUS: You are currently in iteration ${currentIteration}/${maxIterations} of function calling. Please be mindful of the remaining iterations and try to accomplish your task efficiently. If you're approaching the limit, prioritize the most essential function calls.`;
  }
  
  // Add message format instruction
  systemPrompt += '\n\nIMPORTANT: Messages in this conversation will be formatted as [sender]: message. When you see [sender]: message, the "sender" indicates who sent that message. Your own messages will be shown as [me]: message.';
  
  // Add provider information if available
  if (request.providers && request.providers.length > 0) {
    systemPrompt += '\n\nAVAILABLE PROVIDERS: You have access to the following providers that can give you additional context and functions:';
    for (const provider of request.providers) {
      systemPrompt += `\n- ${provider.name}: ${provider.description}`;
    }
    systemPrompt += '\n\nTo get detailed information about a provider and its available functions, use the getProviderSpec function with the provider name.';
  }

  messages.push({
    role: 'system',
    content: systemPrompt
  });

  // Convert Cubicler messages to OpenAI format with enhanced sender formatting
  for (const message of request.messages || []) {
    // Determine role and format sender
    const role = message.sender === agentName ? 'assistant' : 'user';
    
    let senderDisplay: string;
    if (message.sender === agentName) {
      senderDisplay = 'me';
    } else {
      senderDisplay = message.sender;
    }
    
    const content = `[${senderDisplay}]: ${message.content}`;

    messages.push({
      role,
      content
    });
  }

  return messages;
}

/**
 * Creates OpenAI function definition for getProviderSpec
 */
export function createGetProviderSpecFunction(
  availableProviders: string[]
): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
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
            enum: availableProviders
          }
        },
        required: ['providerName']
      }
    }
  };
}

/**
 * Converts agent function definitions to OpenAI function tools
 */
export function convertAgentFunctionsToOpenAI(
  functions: AgentFunctionDefinition[]
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return functions.map(func => ({
    type: 'function' as const,
    function: {
      name: func.name,
      description: func.description,
      parameters: func.parameters || { type: 'object', properties: {} }
    }
  }));
}
