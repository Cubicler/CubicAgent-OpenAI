import type { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionMessageToolCall } from 'openai/resources/chat/completions.js';

/**
 * OpenAI Chat Completion Request Parameters
 * Model for structuring OpenAI API request parameters
 */
export interface OpenAIRequestParams {
  model: string;
  messages: ChatCompletionMessageParam[];
  temperature: number;
  max_tokens: number;
  tools?: ChatCompletionTool[];
}

/**
 * OpenAI Chat Completion Response
 * Model for OpenAI API response structure
 */
export interface OpenAIResponse {
  content: string | null;
  usedTokens: number;
  toolCalls?: ChatCompletionMessageToolCall[];
}

/**
 * Tool Execution Result
 * Model for the result of executing tool calls
 */
export interface ToolExecutionResult {
  toolMessages: ChatCompletionMessageParam[];
  updatedTools: ChatCompletionTool[];
}

/**
 * Agent Response
 * Model for the final agent response
 */
export interface AgentResponse {
  type: 'text';
  content: string;
  usedToken: number;
}

/**
 * Process Tool Calls Result
 * Model for the result of processing tool calls and continuing conversation
 */
export interface ProcessToolCallsResult {
  messages: ChatCompletionMessageParam[];
  tools: ChatCompletionTool[];
}

/**
 * Session State
 * Model for tracking state during iterative conversation sessions
 */
export interface SessionState {
  iteration: number;
  currentMessages: ChatCompletionMessageParam[];
  currentTools: ChatCompletionTool[];
  totalUsedTokens: number;
}
