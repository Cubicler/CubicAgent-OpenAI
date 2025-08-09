import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { JSONValue } from '../config/types.js';
import type { InternalTool, InternalToolResult } from '../internal-tools/internal-tool.interface.js';
import type { InternalToolHandling } from '../internal-tools/internal-tool-handler.interface.js';
import type { Logger } from '@/utils/logger.interface.js';
import { createLogger } from '@/utils/pino-logger.js';

/**
 * InternalToolAggregator - Generic aggregator for internal tools
 * 
 * This class implements a flexible composition pattern:
 * - Accepts any array of InternalTool implementations
 * - Routes function calls to the appropriate tool
 * - Provides unified interface for all internal tools
 * - Highly extensible - new tools can be added without changing this class
 */
export class InternalToolAggregator implements InternalToolHandling {
  private readonly tools: InternalTool[];
  private readonly logger: Logger;

  constructor(tools: InternalTool[], logger?: Logger) {
    this.tools = tools;
    this.logger = logger ?? createLogger({ silent: true });
  }

  /**
   * Build tool definitions for OpenAI function calling
   * Aggregates tools from all registered tools
   */
  buildTools(): ChatCompletionTool[] {
    return this.tools.map(tool => tool.getToolDefinition());
  }

  /**
   * Check if any tool can handle the given function name
   */
  canHandle(functionName: string): boolean {
    return this.tools.some(tool => tool.canHandle(functionName));
  }

  /**
   * Execute a function call using the appropriate tool
   * Routes to the first tool that can handle the function
   */
  async executeFunction(functionName: string, parameters: JSONValue): Promise<InternalToolResult> {
    // Find the tool that can handle this function
    const tool = this.tools.find(t => t.canHandle(functionName));
    
    if (!tool) {
      return {
        success: false,
        error: `No tool found for function: ${functionName}`,
        functionName
      };
    }

    try {
      // Execute the function using the appropriate tool
      return await tool.execute(parameters);
    } catch (error) {
      this.logger.error(`❌ Tool execution failed for ${functionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        functionName
      };
    }
  }

  /**
   * Get all supported function names from all tools
   */
  getSupportedFunctions(): string[] {
    return this.tools.map(tool => tool.toolName);
  }

  /**
   * Get the total number of tools
   */
  getToolCount(): number {
    return this.tools.length;
  }

  /**
   * Add a new tool to the aggregator
   * Useful for dynamic tool registration
   */
  addTool(tool: InternalTool): void {
    this.tools.push(tool);
  }

  /**
   * Remove a tool from the aggregator
   * Returns true if tool was found and removed
   */
  removeTool(toolName: string): boolean {
    const index = this.tools.findIndex(tool => tool.toolName === toolName);
    if (index !== -1) {
      this.tools.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get a specific tool by name
   */
  getTool(toolName: string): InternalTool | undefined {
    return this.tools.find(tool => tool.toolName === toolName);
  }
}
