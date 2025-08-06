import OpenAI from 'openai';
import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { InternalTool, InternalToolResult } from '../internal-tool.interface.js';
import type { JSONValue } from '../../config/types.js';

/**
 * Summarizer Internal Tool
 * 
 * Wraps an existing internal tool to provide summarization capabilities.
 * This approach uses composition to add summarization without modifying original tools.
 * 
 * Usage:
 * new SummarizerInternalTool(new MemoryRecallTool(memory), 'gpt-4o-mini', apiKey)
 */
export class SummarizerInternalTool implements InternalTool {
  readonly toolName: string;
  
  private openai: OpenAI;
  private summarizerModel: string;
  private originalTool: InternalTool;

  constructor(
    originalTool: InternalTool,
    summarizerModel: string,
    openaiApiKey: string
  ) {
    this.toolName = `summarize_${originalTool.toolName}`;
    this.originalTool = originalTool;
    this.summarizerModel = summarizerModel;
    
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
  }

  /**
   * Get the tool definition for this specific summarizer
   */
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

  /**
   * Check if this tool can handle the given function name
   */
  canHandle(functionName: string): boolean {
    return functionName === this.toolName;
  }

  /**
   * Execute the summarizer internal tool
   */
  async execute(parameters: JSONValue): Promise<InternalToolResult> {
    // Validate parameters structure
    if (!parameters || typeof parameters !== 'object') {
      return {
        success: false,
        error: 'Invalid parameters for summarizer internal tool'
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
      console.log(`🔧 Executing ${this.originalTool.toolName} for summarization`);
      
      // Execute the original internal tool
      const toolResult = await this.originalTool.execute(originalParams as JSONValue);
      
      console.log(`🤖 Summarizing ${this.originalTool.toolName} results with ${this.summarizerModel}`);
      
      // Summarize the results using the dedicated model
      const summaryResult = await this.summarizeResult(toolResult, prompt);
      
      return {
        success: true,
        message: 'Internal tool executed and summarized successfully',
        originalTool: this.originalTool.toolName,
        originalResult: toolResult,
        summary: summaryResult.summary,
        tokensUsed: summaryResult.tokensUsed
      };
      
    } catch (error) {
      console.error(`❌ Summarizer failed for ${this.originalTool.toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in internal tool execution',
        originalTool: this.originalTool.toolName
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
            content: 'You are a helpful assistant that summarizes internal tool execution results based on user instructions. Provide clear, concise summaries that highlight the most relevant information.'
          },
          {
            role: 'user',
            content: `${prompt}\n\nInternal Tool Result:\n${JSON.stringify(toolResult, null, 2)}`
          }
        ],
        temperature: 0.3 // Lower temperature for more consistent summaries
      });

      const summary = response.choices[0]?.message?.content || 'No summary generated';
      const tokensUsed = response.usage?.total_tokens || 0;
      
      return { summary, tokensUsed };
      
    } catch (error) {
      console.error('❌ OpenAI summarization failed:', error);
      throw new Error(`Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}