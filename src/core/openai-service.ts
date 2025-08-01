import { CubicAgent, AxiosAgentClient, ExpressAgentServer } from '@cubicler/cubicagentkit';
import type { AgentRequest, AgentClient, AgentTool } from '@cubicler/cubicagentkit';
import OpenAI from 'openai';
import type { OpenAIConfig, DispatchConfig } from '../config/environment.js';
import type { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionMessageToolCall} from 'openai/resources/chat/completions.js';
import type { OpenAIRequestParams, OpenAIResponse, ToolExecutionResult, AgentResponse, ProcessToolCallsResult } from '../models/types.js';
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

    console.log(`🚀 ${openaiConfig.model} ready - port:${dispatchConfig.agentPort}`);
  }

  /**
   * Start the CubicAgent (kit will handle client initialization automatically)
   */
  async start(): Promise<void> {
    await this.cubicAgent.start(async (request, client, _context) => {
      console.log(`📨 ${request.agent.name} | ${request.tools.length} tools | ${request.messages.length} msgs`);

      try {
        // Execute the iterative function calling loop
        return await this.executeIterativeLoop(request, client);
      } catch (error) {
        console.error(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`);
        return {
          type: 'text' as const,
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          usedToken: 0
        };
      }
    });
  }

  /**
   * Execute the iterative function calling loop with OpenAI
   */
  private async executeIterativeLoop(
    request: AgentRequest,
    client: AgentClient
  ): Promise<AgentResponse> {
    // Initialize iteration variables
    let iteration = 1;
    let currentMessages = buildOpenAIMessages(request, this.openaiConfig, this.dispatchConfig, iteration);
    let currentTools = this.buildOpenAITools(request.tools);
    let totalUsedTokens = 0;

    // Iterative function calling loop
    while (iteration <= this.dispatchConfig.sessionMaxIteration) {
      console.log(`🔄 Iter ${iteration}/${this.dispatchConfig.sessionMaxIteration}`);
      
      // Update system message with current iteration
      currentMessages[0] = {
        role: 'system',
        content: buildSystemMessage(request, this.openaiConfig, this.dispatchConfig, iteration)
      };

      // Call OpenAI API
      const result = await this.callOpenAI(currentMessages, currentTools);
      totalUsedTokens += result.usedTokens;

      console.log(`💬 Response: ${result.content ? 'text' : 'none'} | Tools: ${result.toolCalls?.length || 0} | Tokens: ${result.usedTokens}`);

      // Check if OpenAI wants to use tools
      if (result.toolCalls && result.toolCalls.length > 0) {
        const updatedState = await this.processToolCallsAndContinue(
          result,
          currentMessages,
          currentTools,
          client
        );
        currentMessages = updatedState.messages;
        currentTools = updatedState.tools;
        iteration++;
      } else {
        // Final response - no tool calls
        console.log('✅ Final response received');
        
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

  /**
   * Send messages to OpenAI and get response
   */
  private async callOpenAI(
    messages: ChatCompletionMessageParam[], 
    tools: ChatCompletionTool[]
  ): Promise<OpenAIResponse> {
    try {
      const requestParams: OpenAIRequestParams = {
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

      const result: OpenAIResponse = {
        content: message?.content || null,
        usedTokens
      };

      if (message?.tool_calls) {
        result.toolCalls = message.tool_calls;
      }

      return result;
    } catch (error) {
      console.error(`❌ OpenAI failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`OpenAI API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process tool calls and continue conversation by adding assistant message and tool results
   */
  private async processToolCallsAndContinue(
    result: OpenAIResponse,
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    client: AgentClient
  ): Promise<ProcessToolCallsResult> {
    // Validate that toolCalls exists (should always be true when called from executeIterativeLoop)
    if (!result.toolCalls || result.toolCalls.length === 0) {
      throw new Error('processToolCallsAndContinue called without valid tool calls');
    }

    // Add the assistant's response with tool calls to conversation
    messages.push({
      role: 'assistant',
      content: result.content,
      tool_calls: result.toolCalls
    });

    // Execute the tool calls
    const { toolMessages, updatedTools } = await this.executeToolCalls(
      result.toolCalls,
      client,
      tools
    );

    // Add tool results to conversation
    messages.push(...toolMessages);

    return { messages, tools: updatedTools };
  }

  /**
   * Convert Cubicler AgentTool to OpenAI ChatCompletionTool format
   */
  private buildOpenAITools(tools: AgentTool[]): ChatCompletionTool[] {
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
   * Execute tool calls from OpenAI and return results as tool messages
   */
  private async executeToolCalls(
    toolCalls: ChatCompletionMessageToolCall[],
    client: AgentClient,
    currentTools: ChatCompletionTool[]
  ): Promise<ToolExecutionResult> {
    const toolMessages: ChatCompletionMessageParam[] = [];
    let updatedTools = [...currentTools];

    for (const toolCall of toolCalls) {
      try {
        const functionName = toolCall.function.name;
        const parameters = JSON.parse(toolCall.function.arguments);

        console.log(`🔧 ${functionName}(${Object.keys(parameters).length} params)`);

        // Call the tool via Cubicler client
        const result = await client.callTool(functionName, parameters);

        // Handle special server tools fetching
        updatedTools = this.handleServerToolsFetch(functionName, result, updatedTools);

        // Add tool result message
        toolMessages.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id
        });

      } catch (error) {
        console.error(`❌ Tool ${toolCall.function.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
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
   * Handle special server tools fetching with early return pattern
   */
  private handleServerToolsFetch(
    functionName: string,
    result: unknown,
    currentTools: ChatCompletionTool[]
  ): ChatCompletionTool[] {
    // Early return if not the server tools function
    if (functionName !== 'cubicler_fetchServerTools') {
      return currentTools;
    }

    // Early return if result is not an object
    if (!result || typeof result !== 'object') {
      return currentTools;
    }

    const serverToolsResponse = result as { tools: AgentTool[] };
    
    // Early return if tools array is not valid
    if (!serverToolsResponse.tools || !Array.isArray(serverToolsResponse.tools)) {
      return currentTools;
    }

    // Convert new tools to OpenAI format and add them
    const newOpenAITools = this.buildOpenAITools(serverToolsResponse.tools);
    console.log(`➕ Added ${newOpenAITools.length} server tools`);
    
    return [...currentTools, ...newOpenAITools];
  }
}
