import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../config/types.js';
import type { InternalToolResult } from './internal-tool.interface.js';

/**
 * Interface for internal tool handlers that manage collections of internal tools
 * 
 * This interface provides a unified way to:
 * - Build tool definitions for OpenAI function calling
 * - Check if a function can be handled by this handler
 * - Execute function calls with proper error handling
 * - Get metadata about supported functions
 */
export interface InternalToolHandling {
  /**
   * Build tool definitions for OpenAI function calling
   * Returns all tools managed by this handler
   */
  buildTools(): ChatCompletionTool[];

  /**
   * Check if this handler can handle the given function name
   */
  canHandle(functionName: string): boolean;

  /**
   * Execute a function call using the appropriate tool
   */
  executeFunction(functionName: string, parameters: JSONValue): Promise<InternalToolResult>;

  /**
   * Get all supported function names
   * Useful for validation and debugging
   */
  getSupportedFunctions(): string[];

  /**
   * Get the number of tools managed by this handler
   * Useful for monitoring and debugging
   */
  getToolCount(): number;
}
