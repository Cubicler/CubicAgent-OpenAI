import OpenAI from 'openai';
import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { InternalTool, InternalToolResult } from '../internal-tool.interface.js';
import type { JSONValue } from '../../config/types.js';
import type { Logger } from '../../utils/logger.interface.js';
import { createLogger } from '../../utils/pino-logger.js';

/**
 * Summarizer Internal Tool
 * 
 * Wraps an existing internal tool to provide summarization capabilities.
 * This approach uses composition to add summarization without modifying original tools.
 */
export class SummarizerInternalTool implements InternalTool {
  readonly toolName: string;
  
  private openai: OpenAI;
  private summarizerModel: string;
  private originalTool: InternalTool;
  private logger: Logger;

  constructor(
    originalTool: InternalTool,
    summarizerModel: string,
    openaiApiKey: string,
    logger?: Logger
  ) {
    this.toolName = `summarize_${originalTool.toolName}`;
    this.originalTool = originalTool;
    this.summarizerModel = summarizerModel;
    this.logger = logger ?? createLogger({ silent: true });
    
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
  }

  getToolDefinition(): ChatCompletionTool {
    const originalDef = this.originalTool.getToolDefinition();
    return {
      type: 'function' as const,
      function: {
        name: this.toolName,
        description: `Execute ${this.originalTool.toolName} and summarize the results. ${originalDef.function.description}`,
        parameters: {
          type: 'object',
          properties: {
            _prompt: {
              type: 'string',
              description: 'Instructions for how to summarize the tool results'
            },
            ...(originalDef.function.parameters?.['properties'] || {})
          },
          required: ['_prompt', ...((originalDef.function.parameters?.['required'] as string[]) || [])]
        }
      }
    };
  }

  canHandle(functionName: string): boolean {
    return functionName === this.toolName;
  }

  async execute(parameters: JSONValue): Promise<InternalToolResult> {
    if (!parameters || typeof parameters !== 'object') {
      return {
        success: false,
        error: 'Invalid parameters for summarizer internal tool'
      };
    }

    const params = parameters as Record<string, JSONValue>;
    const prompt = params['_prompt'] as string;
    
    if (!prompt) {
      return {
        success: false,
        error: 'Missing required _prompt parameter'
      };
    }

    const { _prompt: _promptParam, ...originalParams } = params;

    try {
      this.logger.info(`🔧 Executing ${this.originalTool.toolName} for summarization`);
      
      const toolResult = await this.originalTool.execute(originalParams as JSONValue);
      
      this.logger.info(`🤖 Summarizing ${this.originalTool.toolName} results with ${this.summarizerModel}`);
      
      const summaryResult = await this.summarizeResult(toolResult as JSONValue, prompt);
      
      return {
        success: true,
        message: 'Internal tool executed and summarized successfully',
        originalTool: this.originalTool.toolName,
        originalResult: toolResult,
        summary: summaryResult.summary,
        tokensUsed: summaryResult.tokensUsed
      };
      
    } catch (error) {
      this.logger.error(`❌ Summarizer failed for ${this.originalTool.toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in internal tool execution',
        originalTool: this.originalTool.toolName
      };
    }
  }

  private async summarizeResult(toolResult: JSONValue, prompt: string): Promise<{ summary: string; tokensUsed: number }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.summarizerModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes internal tool execution results based on user instructions. Provide clear, concise summaries that highlight the most relevant information.'
          },
          {
            role: 'user',
            content: `${prompt}\n\nInternal Tool Result:\n${JSON.stringify(toolResult, null, 2)}`
          }
        ],
        temperature: 0.3
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