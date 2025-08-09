import OpenAI from 'openai';
import type { AgentTool, AgentClient } from '@cubicler/cubicagentkit';
import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { InternalTool, InternalToolResult } from '../internal-tool.interface.js';
import type { JSONValue } from '../../config/types.js';
import type { Logger } from '../../utils/logger.interface.js';
import { createLogger } from '../../utils/pino-logger.js';

/**
 * Individual Summarizer Tool Instance
 * 
 * Each instance handles one specific tool summarization (e.g., summarize_getLogs)
 * This approach allows for clean registration with InternalToolAggregator.addTool()
 * 
 * Usage:
 * 1. Create instances for each available tool
 * 2. Add each instance to the aggregator via addTool()
 * 3. When tools are updated, create new instances and add them
 */
export class SummarizerToolInstance implements InternalTool {
  readonly toolName: string;
  
  private openai: OpenAI;
  private summarizerModel: string;
  private originalTool: AgentTool;
  private agentClient: AgentClient;
  private logger: Logger;

  constructor(
    originalTool: AgentTool,
    summarizerModel: string,
    openaiApiKey: string,
    agentClient: AgentClient,
    logger?: Logger
  ) {
    this.toolName = `summarize_${originalTool.name}`;
    this.originalTool = originalTool;
    this.summarizerModel = summarizerModel;
    this.agentClient = agentClient;
    this.logger = logger ?? createLogger({ silent: true });
    
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
  }

  /**
   * Get the tool definition for this specific summarizer
   */
  getToolDefinition(): ChatCompletionTool {
    return {
      type: 'function' as const,
      function: {
        name: this.toolName,
        description: `Execute ${this.originalTool.name} and summarize the results. ${this.originalTool.description}`,
        parameters: {
          type: 'object',
          properties: {
            _prompt: {
              type: 'string',
              description: 'Instructions for how to summarize the tool results'
            },
            ...(this.originalTool.parameters?.properties || {})
          },
          required: ['_prompt', ...(this.originalTool.parameters?.required || [])]
        }
      }
    };
  }

  /**
   * Check if this tool can handle the given function name
   */
  canHandle(functionName: string): boolean {
    return functionName === this.toolName;
  }

  /**
   * Execute the summarizer tool
   */
  async execute(parameters: JSONValue): Promise<InternalToolResult> {
    // Validate parameters structure
    if (!parameters || typeof parameters !== 'object') {
      return {
        success: false,
        error: 'Invalid parameters for summarizer tool'
      };
    }

    const params = parameters as Record<string, unknown>;
    const prompt = params['_prompt'] as string;
    
    if (!prompt) {
      return {
        success: false,
        error: 'Missing required _prompt parameter'
      };
    }

    // Extract original tool parameters (everything except _prompt)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _prompt: _promptParam, ...originalParams } = params;

    try {
      this.logger.info(`🔧 Executing ${this.originalTool.name} for summarization`);
      
      // Type assertion for AgentClient.callTool compatibility
      const typedParams = originalParams as Record<string, JSONValue>;
      
      // Execute the original tool
      const toolResult = await this.agentClient.callTool(this.originalTool.name, typedParams);
      
      this.logger.info(`🤖 Summarizing ${this.originalTool.name} results with ${this.summarizerModel}`);
      
      // Summarize the results using the dedicated model
      const summaryResult = await this.summarizeResult(toolResult, prompt);
      
      return {
        success: true,
        message: 'Tool executed and summarized successfully',
        originalTool: this.originalTool.name,
        originalResult: toolResult,
        summary: summaryResult.summary,
        tokensUsed: summaryResult.tokensUsed
      };
      
    } catch (error) {
      this.logger.error(`❌ Summarizer failed for ${this.originalTool.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in tool execution',
        originalTool: this.originalTool.name
      };
    }
  }

  /**
   * Use the summarizer model to summarize tool results
   */
  private async summarizeResult(toolResult: unknown, prompt: string): Promise<{ summary: string; tokensUsed: number }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.summarizerModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes tool execution results based on user instructions. Provide clear, concise summaries that highlight the most relevant information.'
          },
          {
            role: 'user',
            content: `${prompt}\n\nTool Result:\n${JSON.stringify(toolResult, null, 2)}`
          }
        ],
        temperature: 0.3 // Lower temperature for more consistent summaries
      });

      const summary = response.choices[0]?.message?.content || 'No summary generated';
      const tokensUsed = response.usage?.total_tokens || 0;
      
      return { summary, tokensUsed };
      
    } catch (error) {
      this.logger.error('❌ OpenAI summarization failed:', error);
      throw new Error(`Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Factory function to create summarizer tool instances for available tools
 */
export function createSummarizerTools(
  availableTools: AgentTool[],
  summarizerModel: string,
  openaiApiKey: string,
  agentClient: AgentClient,
  logger: Logger
): SummarizerToolInstance[] {
  return availableTools.map(tool => 
    new SummarizerToolInstance(tool, summarizerModel, openaiApiKey, agentClient, logger)
  );
}
