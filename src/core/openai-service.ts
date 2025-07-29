import { CubicAgent, AxiosAgentClient, ExpressAgentServer } from '@cubicler/cubicagentkit';
import OpenAI from 'openai';
import type { AgentRequest } from '@cubicler/cubicagentkit';
import type { OpenAIConfig, DispatchConfig } from '../config/environment.js';
import type { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionMessageToolCall} from 'openai/resources/chat/completions.js';
import { buildOpenAIMessages, buildSystemMessage, cleanFinalResponse } from '../utils/message-helper.js';

/**
 * OpenAIService
 * Handle all OpenAI API communication and iterative function calling loop
 * 
 * Key Responsibilities:
 * - Execute iterative function calling loop with DISPATCH_SESSION_MAX_ITERATION limit
 * - Manage conversation history across multiple OpenAI API calls within a session
 * - Build dynamic tools array from available functions
 * - Handle OpenAI Chat Completions with function calling enabled
 * - Track token usage and enforce OPENAI_SESSION_MAX_TOKENS limits
 * - Process tool calls and continue conversation until final response
 */
export class OpenAIService {
  private cubicAgent: CubicAgent;
  private openai: OpenAI;
  private openaiConfig: OpenAIConfig;
  private dispatchConfig: DispatchConfig;

  constructor(
    openaiConfig: OpenAIConfig,
    dispatchConfig: DispatchConfig,
    cubiclerUrl: string
  ) {
    this.openaiConfig = openaiConfig;
    this.dispatchConfig = dispatchConfig;

    // Initialize OpenAI client with full configuration
    this.openai = new OpenAI({
      apiKey: openaiConfig.apiKey,
      organization: openaiConfig.organization,
      project: openaiConfig.project,
      baseURL: openaiConfig.baseURL,
      timeout: openaiConfig.timeout,
      maxRetries: openaiConfig.maxRetries,
    });

    // Initialize CubicAgentKit components
    const client = new AxiosAgentClient(cubiclerUrl, dispatchConfig.mcpCallTimeout);
    const server = new ExpressAgentServer(dispatchConfig.agentPort, dispatchConfig.endpoint);
    this.cubicAgent = new CubicAgent(client, server);

    console.log('OpenAIService initialized', {
      model: openaiConfig.model,
      temperature: openaiConfig.temperature,
      maxTokens: openaiConfig.sessionMaxTokens,
      maxIterations: dispatchConfig.sessionMaxIteration,
      endpoint: dispatchConfig.endpoint,
      agentPort: dispatchConfig.agentPort,
      cubiclerUrl
    });
  }

  /**
   * Start the CubicAgent (kit will handle client initialization automatically)
   */
  async start(): Promise<void> {
    await this.cubicAgent.start(async (request, client, _context) => {
      console.log('Received request:', {
        agent: request.agent.name,
        toolsCount: request.tools.length,
        serversCount: request.servers.length,
        messagesCount: request.messages.length
      });

      try {
        // Execute the iterative function calling loop
        return await this.executeIterativeLoop(request, client);
      } catch (error) {
        console.error('Error processing request:', error);
        return {
          type: 'text' as const,
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          usedToken: 0
        };
      }
    });
  }

  /**
   * Convert Cubicler AgentTool to OpenAI ChatCompletionTool format
   */
  private buildOpenAITools(tools: import('@cubicler/cubicagentkit').AgentTool[]): ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Send messages to OpenAI and get response
   */
  private async callOpenAI(
    messages: ChatCompletionMessageParam[], 
    tools: ChatCompletionTool[]
  ): Promise<{ content: string | null; usedTokens: number; toolCalls?: ChatCompletionMessageToolCall[] }> {
    try {
      const requestParams: {
        model: string;
        messages: ChatCompletionMessageParam[];
        temperature: number;
        max_tokens: number;
        tools?: ChatCompletionTool[];
      } = {
        model: this.openaiConfig.model,
        messages: messages,
        temperature: this.openaiConfig.temperature,
        max_tokens: this.openaiConfig.sessionMaxTokens,
      };

      // Only add tools if there are any
      if (tools.length > 0) {
        requestParams.tools = tools;
      }

      const response = await this.openai.chat.completions.create(requestParams);

      const message = response.choices[0]?.message;
      const usedTokens = response.usage?.total_tokens || 0;

      const result: { content: string | null; usedTokens: number; toolCalls?: ChatCompletionMessageToolCall[] } = {
        content: message?.content || null,
        usedTokens
      };

      if (message?.tool_calls) {
        result.toolCalls = message.tool_calls;
      }

      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute tool calls from OpenAI and return results as tool messages
   */
  private async executeToolCalls(
    toolCalls: ChatCompletionMessageToolCall[],
    client: import('@cubicler/cubicagentkit').AgentClient,
    currentTools: ChatCompletionTool[]
  ): Promise<{ toolMessages: ChatCompletionMessageParam[]; updatedTools: ChatCompletionTool[] }> {
    const toolMessages: ChatCompletionMessageParam[] = [];
    let updatedTools = [...currentTools];

    for (const toolCall of toolCalls) {
      try {
        const functionName = toolCall.function.name;
        const parameters = JSON.parse(toolCall.function.arguments);

        console.log(`Executing tool: ${functionName}`, parameters);

        // Call the tool via Cubicler client
        const result = await client.callTool(functionName, parameters);

        // Special handling for cubicler.fetch_server_tools
        if (functionName === 'cubicler.fetch_server_tools' && result && typeof result === 'object') {
          const serverToolsResponse = result as unknown as { tools: import('@cubicler/cubicagentkit').AgentTool[] };
          if (serverToolsResponse.tools && Array.isArray(serverToolsResponse.tools)) {
            // Convert new tools to OpenAI format and add them
            const newOpenAITools = this.buildOpenAITools(serverToolsResponse.tools);
            updatedTools = [...updatedTools, ...newOpenAITools];
            
            console.log(`Added ${newOpenAITools.length} new tools from server`);
          }
        }

        // Add tool result message
        toolMessages.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id
        });

      } catch (error) {
        console.error(`Tool execution failed for ${toolCall.function.name}:`, error);
        
        // Add error message as tool result
        toolMessages.push({
          role: 'tool',
          content: JSON.stringify({ 
            error: `Failed to execute ${toolCall.function.name}: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }),
          tool_call_id: toolCall.id
        });
      }
    }

    return { toolMessages, updatedTools };
  }

  /**
   * Execute the iterative function calling loop with OpenAI
   */
  private async executeIterativeLoop(
    request: AgentRequest,
    client: import('@cubicler/cubicagentkit').AgentClient
  ): Promise<{ type: 'text'; content: string; usedToken: number }> {
    // Initialize iteration variables
    let iteration = 1;
    const currentMessages = buildOpenAIMessages(request, this.openaiConfig, this.dispatchConfig, iteration);
    let currentTools = this.buildOpenAITools(request.tools);
    let totalUsedTokens = 0;

    // Iterative function calling loop
    while (iteration <= this.dispatchConfig.sessionMaxIteration) {
      console.log(`Iteration ${iteration}/${this.dispatchConfig.sessionMaxIteration}`);
      
      // Update system message with current iteration
      currentMessages[0] = {
        role: 'system',
        content: buildSystemMessage(request, this.openaiConfig, this.dispatchConfig, iteration)
      };

      console.log('Calling OpenAI with:', {
        messageCount: currentMessages.length,
        toolCount: currentTools.length,
        model: this.openaiConfig.model,
        iteration
      });

      // Call OpenAI API
      const result = await this.callOpenAI(currentMessages, currentTools);
      totalUsedTokens += result.usedTokens;

      console.log('OpenAI response:', {
        hasContent: !!result.content,
        hasToolCalls: !!result.toolCalls,
        toolCallsCount: result.toolCalls?.length || 0,
        usedTokens: result.usedTokens,
        totalUsedTokens
      });

      // Check if OpenAI wants to use tools
      if (result.toolCalls && result.toolCalls.length > 0) {
        // Add the assistant's response with tool calls to conversation
        currentMessages.push({
          role: 'assistant',
          content: result.content,
          tool_calls: result.toolCalls
        });

        // Execute the tool calls
        const { toolMessages, updatedTools } = await this.executeToolCalls(
          result.toolCalls,
          client,
          currentTools
        );

        // Add tool results to conversation
        currentMessages.push(...toolMessages);
        
        // Update available tools (in case new tools were added)
        currentTools = updatedTools;

        // Continue to next iteration
        iteration++;
      } else {
        // Final response - no tool calls
        console.log('Final response received');
        
        // Clean the final response content
        const cleanedContent = cleanFinalResponse(result.content);
        
        return {
          type: 'text' as const,
          content: cleanedContent,
          usedToken: totalUsedTokens
        };
      }
    }

    // Max iterations reached
    throw new Error(`Maximum iterations (${this.dispatchConfig.sessionMaxIteration}) reached without final response`);
  }
}
