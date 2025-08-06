/**
 * Re-export types from CubicAgentKit for convenience
 * These types are used throughout the OpenAI service implementation
 */
export type {
  AgentRequest,
  AgentResponse,
  RawAgentResponse,
  AgentTool,
  AgentClient,
  CallContext,
  ServerInfo,
  Message,
  MessageSender,
  JSONValue,
  JSONObject,
  JSONArray,
  MemoryRepository,
  MemorySearchOptions,
  AgentMemory
} from '@cubicler/cubicagentkit';

/**
 * Re-export OpenAI types for convenience
 * Use the official OpenAI library types instead of creating our own
 */
export type {
  ChatCompletionTool,
  ChatCompletionMessageToolCall,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  ChatCompletion
} from 'openai/resources/chat/completions';

// Import AgentTool for local use
import type { AgentTool } from '@cubicler/cubicagentkit';

/**
 * Additional types for our implementation
 */

// Tool result wrapper
export interface ToolResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

// Provider state management
export interface ProviderState {
  loaded: boolean;
  tools: AgentTool[];
}

// Session context for managing iterations
export interface SessionContext {
  iteration: number;
  maxIterations: number;
  tokensUsed: number;
  toolsUsed: number;
  providerStates: Map<string, ProviderState>;
}
