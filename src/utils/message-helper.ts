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
  let systemMessage = '';

  // Start with the agent's prompt from Cubicler dispatch
  if (request.agent.prompt) {
    systemMessage += request.agent.prompt;
  }

  // Add recent memory context if available
  if (memory) {
    systemMessage += `\n\n## Memory Management\nYou have access to a persistent memory system through function calls. Key functions include:

**Storage & Retrieval:**
- **agentmemory_remember**: Store important information as sentences with tags for future reference
- **agentmemory_search**: Search for relevant past information using flexible criteria and filters
- **agentmemory_recall**: Recall a specific memory by its ID
- **agentmemory_get_short_term**: Get recent memories within token capacity for context
- **agentmemory_forget**: Remove memories completely by ID (use with caution)

**Memory Management:**
- **agentmemory_add_to_short_term**: Add memories to short-term storage for immediate context
- **agentmemory_edit_importance**: Update importance scores (0-1) for existing memories
- **agentmemory_edit_content**: Update the content/sentence of existing memories
- **agentmemory_add_tag**: Add tags to existing memories for better categorization
- **agentmemory_remove_tag**: Remove tags from memories (cannot result in empty tags)
- **agentmemory_replace_tags**: Replace all tags for a memory with new ones

**Best Practices:**
- Store information as clear, complete sentences (e.g., "John prefers direct communication")
- Always include meaningful tags for categorization (required, cannot be empty)
- Use importance scores (0-1) to prioritize critical information
- Search and recall relevant context before responding to maintain continuity

**Examples of what to store:**
- User preferences and personal information
- Important decisions or commitments made
- Key facts about ongoing projects or topics
- Previous conversations' important outcomes

When to use memory:
- Store information when users share personal details, preferences, or important facts
- Search memory when users reference past conversations or ask about previous topics
- Recall specific memories when users mention particular topics or IDs
- Delete information when users correct previous statements or request removal

Always use memory functions to maintain conversation continuity and provide personalized responses.`;
    try {
      const recentMemories = memory.getShortTermMemories();
      if (recentMemories && recentMemories.length > 0) {
        systemMessage += '\n\n## Recent Memory\nHere are some recent relevant memories that might help with the current conversation:\n\n';
        
        for (const memoryItem of recentMemories) {
          const tagsDisplay = memoryItem.tags.length > 0 ? ` [${memoryItem.tags.join(', ')}]` : '';
          systemMessage += `- ${memoryItem.sentence}${tagsDisplay}\n`;
        }
        
        systemMessage += '\nUse this information to provide more contextual and relevant responses.';
      }
    } catch (error) {
      console.warn('Failed to retrieve memory context:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Add message format instructions for group chat
  systemMessage += `\n\nIMPORTANT: Messages from users will be in JSON format containing sender information:
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
    
    // Check if summarizer tools are available (check for tools starting with 'summarize_')
    const summarizerTools = request.tools.filter(tool => tool.name.startsWith('summarize_'));
    if (summarizerTools.length > 0) {
      systemMessage += `\n\n## Summarizer Tools Available\nYou have access to ${summarizerTools.length} summarizer tools that can execute other tools and provide AI-powered summaries of their results.

**Available Summarizer Tools:**\n`;
      
      for (const tool of summarizerTools) {
        const originalToolName = tool.name.replace('summarize_', '');
        systemMessage += `- **${tool.name}**: Execute ${originalToolName} and summarize results based on your prompt\n`;
      }
      
      systemMessage += `\n**How to use summarizer tools:**
- Include a "_prompt" parameter with specific instructions for summarization
- Example: "Focus on errors only", "Highlight key metrics", "Extract main findings"
- All other parameters are passed directly to the original tool
- The summarizer will execute the tool and provide a focused, relevant summary

**When to use summarizers:**
- When you need a focused view of tool results
- To extract specific information from large datasets
- To get insights tailored to the user's current question
- To reduce information overload from verbose tool outputs`;
    }
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
