import type { AgentRequest, MemoryRepository } from '@cubicler/cubicagentkit';
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
  iteration: number = 1,
  memory?: MemoryRepository
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  // Build system message with agent context and iteration info
  const systemContent = buildSystemMessage(request, openaiConfig, dispatchConfig, iteration, memory);
  
  messages.push({
    role: 'system',
    content: systemContent
  });

  // Convert request messages to OpenAI format (messages is optional in AgentRequest)
  const requestMessages = Array.isArray(request.messages) ? request.messages : [];
  for (const message of requestMessages) {
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
 * Build system message with agent prompt and OpenAI-specific context
 * Includes the agent's prompt from Cubicler dispatch plus iteration and token limits
 * Also includes recent memory context if available
 */
export function buildSystemMessage(
  request: AgentRequest, 
  openaiConfig: OpenAIConfig,
  dispatchConfig: DispatchConfig,
  iteration: number,
  memory?: MemoryRepository
): string {
  let systemMessage = request.agent.prompt || '';

  // Add memory context if available
  if (memory) {
    systemMessage += `\n\n## Memory Functions
Use these for persistent context: agentmemory_remember, agentmemory_search, agentmemory_recall, agentmemory_get_short_term, agentmemory_forget, agentmemory_edit_content, agentmemory_edit_importance, agentmemory_add_tag, agentmemory_remove_tag, agentmemory_replace_tags.
Store as complete sentences with tags. Use importance scores 0-1.`;

    // Add recent memories if available
    try {
      const recentMemories = memory.getShortTermMemories();
      if (recentMemories?.length > 0) {
        systemMessage += '\n\n## Recent Context\n';
        for (const memoryItem of recentMemories) {
          const tagsDisplay = memoryItem.tags.length > 0 ? ` [${memoryItem.tags.join(', ')}]` : '';
          systemMessage += `- ${memoryItem.sentence}${tagsDisplay}\n`;
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve memory context:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Message format and limits (phrasing aligned with unit tests)
  systemMessage += `\n\nIMPORTANT: Messages from users will be in JSON format with fields senderId, name, content. Always respond in plain text unless calling tools.`;
  systemMessage += `\nThis is iteration ${iteration} of ${dispatchConfig.sessionMaxIteration}`;
  systemMessage += `\nYou have a maximum of ${openaiConfig.sessionMaxTokens} tokens`;
  if (request.tools && request.tools.length > 0) {
    const remaining = Math.max(0, dispatchConfig.sessionMaxIteration - iteration);
    systemMessage += `\nYou have ${remaining} remaining iterations to make tool calls`;
  }

  // Summarizer tools if available
  const summarizerTools = request.tools.filter(tool => tool.name.startsWith('summarize_'));
  if (summarizerTools.length > 0) {
    systemMessage += `\nSummarizer tools available: ${summarizerTools.map(t => t.name).join(', ')}. Use _prompt parameter for focus.`;
  }

  return systemMessage;
}

/**
 * Clean and extract final response content from OpenAI
 * Handles potential JSON responses and extracts meaningful content
 */
export function cleanFinalResponse(content: string | null): string {
  if (!content) {
    return 'No response from OpenAI';
  }

  // Try to parse as JSON and extract content field if it exists
  const extractedContent = tryExtractJsonContent(content);
  if (extractedContent !== null) {
    return extractedContent;
  }

  // Return as plain text if not JSON or no content field found
  return content;
}

/**
 * Attempt to extract content from JSON response
 * Returns null if not valid JSON or no content field found
 */
function tryExtractJsonContent(content: string): string | null {
  try {
    const parsed = JSON.parse(content);
    
    // If it's an object with a content field, extract it
    if (isObjectWithContentField(parsed)) {
      const extractedContent = typeof parsed.content === 'string' ? parsed.content : content;
      console.log('Extracted content from JSON response:', {
        originalLength: content.length,
        extractedLength: extractedContent.length,
        wasJSON: true
      });
      return extractedContent;
    }
    
    // If it's an object but no content field, return null to use original
    console.log('JSON response without content field, using original');
    return null;
  } catch {
    // Not JSON, return null to use original content as plain text
    console.log('Response is not JSON, using as plain text');
    return null;
  }
}

/**
 * Type guard to check if parsed object has a content field
 */
function isObjectWithContentField(parsed: unknown): parsed is { content: unknown } {
  return typeof parsed === 'object' && parsed !== null && 'content' in parsed;
}
