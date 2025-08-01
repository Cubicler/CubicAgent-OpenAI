import type { AgentRequest } from '@cubicler/cubicagentkit';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import type { OpenAIConfig, DispatchConfig } from '../config/environment.js';

/**
 * Message Helper Utilities
 * Handles conversion between Cubicler and OpenAI message formats
 */

/**
 * Convert AgentRequest messages to OpenAI message format
 * Handles different message types and builds conversation context
 */
export function buildOpenAIMessages(
  request: AgentRequest, 
  openaiConfig: OpenAIConfig,
  dispatchConfig: DispatchConfig,
  iteration: number = 1
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  // Build system message with agent context and iteration info
  const systemContent = buildSystemMessage(request, openaiConfig, dispatchConfig, iteration);
  messages.push({
    role: 'system',
    content: systemContent
  });

  // Convert request messages to OpenAI format
  for (const message of request.messages) {
    // Skip messages with null content
    if (!message.content) {
      continue;
    }

    // Check if message is from the agent (assistant) by comparing sender ID
    if (message.sender.id === request.agent.identifier) {
      messages.push({
        role: 'assistant', 
        content: message.content
      });
    } else {
      // Format user messages with sender information in JSON format
      const messageWithSender = {
        senderId: message.sender.id,
        name: message.sender.name || 'Unknown',
        content: message.content
      };
      
      messages.push({
        role: 'user',
        content: JSON.stringify(messageWithSender)
      });
    }
    // Note: tool messages will be handled separately during function calling
  }

  return messages;
}

/**
 * Build system message with OpenAI-specific context
 * Only adds iteration and token limits - Cubicler handles agent description
 */
export function buildSystemMessage(
  request: AgentRequest, 
  openaiConfig: OpenAIConfig,
  dispatchConfig: DispatchConfig,
  iteration: number
): string {
  let systemMessage = '';

  // Add message format instructions for group chat
  systemMessage += `IMPORTANT: Messages from users will be in JSON format containing sender information:
{
  "senderId": "string", // the ID of the sender
  "name": "string",     // the name of the sender  
  "content": "string"   // the actual message content
}

When responding, always provide your final response as plain text (not JSON). Only use this JSON format to understand who sent each message.`;

  // Add iteration context for tool calling limits
  systemMessage += `\n\nThis is iteration ${iteration} of ${dispatchConfig.sessionMaxIteration} for this conversation session.`;
  
  // Add token limit information
  systemMessage += `\nYou have a maximum of ${openaiConfig.sessionMaxTokens} tokens for your response.`;

  // Add tool usage guidance if tools are available
  if (request.tools.length > 0) {
    const remainingIterations = dispatchConfig.sessionMaxIteration - iteration;
    systemMessage += `\nYou have ${remainingIterations} remaining iterations to make tool calls if needed.`;
  }

  return systemMessage;
}

/**
 * Clean and extract final response content from OpenAI
 * Handles JSON responses from OpenAI that might contain content field
 */
export function cleanFinalResponse(content: string | null): string {
  if (!content) {
    return 'No response from OpenAI';
  }

  // Try to parse as JSON first (similar to Cubicler 1.0 behavior)
  try {
    const parsed = JSON.parse(content);
    
    // If it's an object with a content field, extract it
    if (typeof parsed === 'object' && parsed !== null && 'content' in parsed) {
      const extractedContent = typeof parsed.content === 'string' ? parsed.content : content;
      console.log('Extracted content from JSON response:', {
        originalLength: content.length,
        extractedLength: extractedContent.length,
        wasJSON: true
      });
      return extractedContent;
    }
    
    // If it's an object but no content field, return the original
    console.log('JSON response without content field, returning original');
    return content;
  } catch {
    // Not JSON, return as-is
    console.log('Response is not JSON, returning as plain text');
    return content;
  }
}
