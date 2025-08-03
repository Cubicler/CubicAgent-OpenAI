import { CubicAgent, AxiosAgentClient, ExpressAgentServer } from '@cubicler/cubicagentkit';
import type { AgentRequest, AgentClient, AgentTool, RawAgentResponse } from '@cubicler/cubicagentkit';
import OpenAI from 'openai';
import type { OpenAIConfig, DispatchConfig } from '../config/environment.js';
import type { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionMessageToolCall} from 'openai/resources/chat/completions.js';
import type { OpenAIRequestParams, OpenAIResponse, ToolExecutionResult, ProcessToolCallsResult, SessionState } from '../models/types.js';
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
  ): Promise<RawAgentResponse> {
    const sessionState = this.initializeSession(request);
    
    while (sessionState.iteration <= this.dispatchConfig.sessionMaxIteration) {
      this.logIterationStart(sessionState);
      
      const result = await this.executeIteration(sessionState, request);
      sessionState.totalUsedTokens += result.usedTokens;
      
      this.logIterationResult(result);

      if (this.shouldContinueIteration(result)) {
        await this.processIterationContinuation(result, sessionState, client);
      } else {
        return this.buildFinalResponse(result, sessionState.totalUsedTokens);
      }
    }

    throw new Error(`Maximum iterations (${this.dispatchConfig.sessionMaxIteration}) reached without final response`);
  }

  /**
   * Initialize session state for iterative processing
   */
  private initializeSession(request: AgentRequest): SessionState {
    return {
      iteration: 1,
      currentMessages: buildOpenAIMessages(request, this.openaiConfig, this.dispatchConfig, 1),
      currentTools: this.buildOpenAITools(request.tools),
      totalUsedTokens: 0
    };
  }

  /**
   * Execute a single iteration of the OpenAI conversation
   */
  private async executeIteration(
    sessionState: SessionState, 
    request: AgentRequest
  ): Promise<OpenAIResponse> {
    // Update system message with current iteration
    sessionState.currentMessages[0] = {
      role: 'system',
      content: buildSystemMessage(request, this.openaiConfig, this.dispatchConfig, sessionState.iteration)
    };

    return await this.callOpenAI(sessionState.currentMessages, sessionState.currentTools);
  }

  /**
   * Check if iteration should continue based on OpenAI response
   */
  private shouldContinueIteration(result: OpenAIResponse): boolean {
    return result.toolCalls !== undefined && result.toolCalls.length > 0;
  }

  /**
   * Process continuation of iteration when tool calls are requested
   */
  private async processIterationContinuation(
    result: OpenAIResponse,
    sessionState: SessionState,
    client: AgentClient
  ): Promise<void> {
    const updatedState = await this.processToolCallsAndContinue(
      result,
      sessionState.currentMessages,
      sessionState.currentTools,
      client
    );
    
    sessionState.currentMessages = updatedState.messages;
    sessionState.currentTools = updatedState.tools;
    sessionState.iteration++;
  }

  /**
   * Build the final response when no more tool calls are needed
   */
  private buildFinalResponse(result: OpenAIResponse, totalUsedTokens: number): RawAgentResponse {
    console.log('✅ Final response received');
    
    const cleanedContent = cleanFinalResponse(result.content);
    
    return {
      type: 'text' as const,
      content: cleanedContent,
      usedToken: totalUsedTokens
    };
  }

  /**
   * Log the start of an iteration
   */
  private logIterationStart(sessionState: SessionState): void {
    console.log(`🔄 Iter ${sessionState.iteration}/${this.dispatchConfig.sessionMaxIteration}`);
  }

  /**
   * Log the result of an iteration
   */
  private logIterationResult(result: OpenAIResponse): void {
    console.log(`💬 Response: ${result.content ? 'text' : 'none'} | Tools: ${result.toolCalls?.length || 0} | Tokens: ${result.usedTokens}`);
  }

  /**
   * Send messages to OpenAI and get response
   */
  private async callOpenAI(
    messages: ChatCompletionMessageParam[], 
    tools: ChatCompletionTool[]
  ): Promise<OpenAIResponse> {
    this.validateOpenAIRequest(messages, tools);

    try {
      const requestParams = this.buildOpenAIRequestParams(messages, tools);
      const response = await this.openai.chat.completions.create(requestParams);
      
      return this.parseOpenAIResponse(response);
    } catch (error) {
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Validate OpenAI request parameters before sending
   */
  private validateOpenAIRequest(
    messages: ChatCompletionMessageParam[], 
    tools: ChatCompletionTool[]
  ): void {
    if (!messages || messages.length === 0) {
      throw new Error('OpenAI request requires at least one message');
    }

    if (messages[0]?.role !== 'system') {
      throw new Error('First message must be a system message');
    }

    // Validate tools array structure if provided
    if (tools && tools.length > 0) {
      for (const tool of tools) {
        if (!tool.function?.name) {
          throw new Error('Invalid tool definition: missing function name');
        }
      }
    }
  }

  /**
   * Build OpenAI request parameters
   */
  private buildOpenAIRequestParams(
    messages: ChatCompletionMessageParam[], 
    tools: ChatCompletionTool[]
  ): OpenAIRequestParams {
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

    return requestParams;
  }

  /**
   * Parse OpenAI API response and extract relevant data
   */
  private parseOpenAIResponse(response: unknown): OpenAIResponse {
    // Type guard for OpenAI response structure
    if (!response || typeof response !== 'object' || !('choices' in response)) {
      throw new Error('Invalid OpenAI response: missing choices array');
    }
    
    const responseObj = response as { choices?: Array<{ message?: unknown }>; usage?: { total_tokens?: number } };
    const message = responseObj.choices?.[0]?.message;
    if (!message) {
      throw new Error('Invalid OpenAI response: missing message in choices');
    }

    const usedTokens = responseObj.usage?.total_tokens || 0;

    const messageObj = message as { content?: string | null; tool_calls?: unknown };
    
    const result: OpenAIResponse = {
      content: messageObj.content || null,
      usedTokens
    };

    if (messageObj.tool_calls) {
      result.toolCalls = messageObj.tool_calls as any; // eslint-disable-line @typescript-eslint/no-explicit-any -- OpenAI tool_calls structure is complex
    }

    return result;
  }

  /**
   * Handle OpenAI API errors with specific error types
   */
  private handleOpenAIError(error: unknown): Error {
    if (error instanceof Error) {
      // Log the original error for debugging
      console.error(`❌ OpenAI API failed: ${error.message}`);
      
      // Return more specific error based on error type
      if (error.message.includes('rate limit')) {
        return new Error(`OpenAI rate limit exceeded: ${error.message}`);
      }
      
      if (error.message.includes('context length')) {
        return new Error(`OpenAI context length exceeded: ${error.message}`);
      }
      
      if (error.message.includes('invalid request')) {
        return new Error(`Invalid OpenAI request: ${error.message}`);
      }
      
      return new Error(`OpenAI API call failed: ${error.message}`);
    }
    
    return new Error('OpenAI API call failed: Unknown error');
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
    this.validateToolCalls(toolCalls);
    
    const toolMessages: ChatCompletionMessageParam[] = [];
    let updatedTools = [...currentTools];

    for (const toolCall of toolCalls) {
      const toolResult = await this.executeSingleToolCall(toolCall, client);
      
      // Handle special server tools fetching
      updatedTools = this.handleServerToolsFetch(toolCall.function.name, toolResult.result, updatedTools);
      
      // Add tool result message
      toolMessages.push({
        role: 'tool',
        content: JSON.stringify(toolResult.result),
        tool_call_id: toolCall.id
      });
    }

    return { toolMessages, updatedTools };
  }

  /**
   * Validate tool calls array before execution
   */
  private validateToolCalls(toolCalls: ChatCompletionMessageToolCall[]): void {
    if (!toolCalls || toolCalls.length === 0) {
      throw new Error('executeToolCalls called with empty tool calls array');
    }

    for (const toolCall of toolCalls) {
      if (!toolCall.function?.name) {
        throw new Error('Invalid tool call: missing function name');
      }
      
      if (!toolCall.id) {
        throw new Error('Invalid tool call: missing tool call ID');
      }
    }
  }

  /**
   * Execute a single tool call and handle errors appropriately
   */
  private async executeSingleToolCall(
    toolCall: ChatCompletionMessageToolCall,
    client: AgentClient
  ): Promise<{ result: unknown }> {
    try {
      const functionName = toolCall.function.name;
      const parameters = this.parseToolCallArguments(toolCall.function.arguments, functionName);

      console.log(`🔧 ${functionName}(${Object.keys(parameters).length} params)`);

      // Call the tool via Cubicler client
      const result = await client.callTool(functionName, parameters);
      return { result };

    } catch (error) {
      const errorMessage = `Failed to execute ${toolCall.function.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ Tool ${toolCall.function.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Return error as result rather than throwing - let the conversation continue
      return { 
        result: { 
          error: errorMessage,
          toolCallId: toolCall.id
        } 
      };
    }
  }

  /**
   * Parse tool call arguments with proper error handling
   */
  private parseToolCallArguments(argumentsString: string, functionName: string): Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any -- Tool parameters can be any valid JSON
    try {
      return JSON.parse(argumentsString);
    } catch (error) {
      throw new Error(`Invalid JSON arguments for tool ${functionName}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
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
    if (functionName !== 'cubicler_fetch_server_tools') {
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
