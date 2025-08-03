import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../config/types.js';

/**
 * Result structure for internal tool operations
 */
export interface InternalToolResult {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Interface for internal tools that can be used by the OpenAI service
 * 
 * Each tool is responsible for:
 * - Providing its ChatCompletionTool definition
 * - Checking if it can handle a specific function call
 * - Executing the function call with proper error handling
 */
export interface InternalTool {
  /**
   * Get the name of the tool/function this tool handles
   */
  readonly toolName: string;

  /**
   * Get the ChatCompletionTool definition for this tool
   */
  getToolDefinition(): ChatCompletionTool;

  /**
   * Check if this tool can handle the given function name
   */
  canHandle(functionName: string): boolean;

  /**
   * Execute the tool function with the given parameters
   */
  execute(parameters: JSONValue): Promise<InternalToolResult>;
}
