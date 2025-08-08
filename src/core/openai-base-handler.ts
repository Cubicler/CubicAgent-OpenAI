import type { AgentClient, AgentRequest, AgentTool, RawAgentResponse, JSONObject } from '@cubicler/cubicagentkit';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionMessageToolCall, ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { DispatchConfig, OpenAIConfig } from '../config/environment.js';
import { buildOpenAIMessages, buildSystemMessage, cleanFinalResponse } from '../utils/message-helper.js';
import type { InternalToolHandling } from '../internal-tools/internal-tool-handler.interface.js';
import type { OpenAIRequestParams, OpenAIResponse, ProcessToolCallsResult, SessionState, ToolExecutionResult } from '../models/types.js';
import { InternalToolAggregator } from './internal-tool-aggregator.js';
import { createSummarizerTools } from '../internal-tools/summarizer/summarizer-tool.js';

export abstract class OpenAIBaseHandler {
  protected readonly openai: OpenAI;
  protected readonly openaiConfig: OpenAIConfig;
  protected readonly dispatchConfig: DispatchConfig;
  protected readonly internalToolHandler: InternalToolHandling | undefined;

  constructor(
    openai: OpenAI,
    openaiConfig: OpenAIConfig,
    dispatchConfig: DispatchConfig,
    internalToolHandler?: InternalToolHandling
  ) {
    this.openai = openai;
    this.openaiConfig = openaiConfig;
    this.dispatchConfig = dispatchConfig;
    this.internalToolHandler = internalToolHandler;
  }

  protected async executeIterativeLoop(
    request: AgentRequest,
    client: AgentClient,
    memory?: MemoryRepository
  ): Promise<RawAgentResponse> {
    const sessionState = this.initializeSession(request, memory);

    while (sessionState.iteration <= this.dispatchConfig.sessionMaxIteration) {
      const result = await this.executeIteration(sessionState, request, memory);
      sessionState.totalUsedTokens += result.usedTokens;

      if (result.toolCalls && result.toolCalls.length > 0) {
        const updatedState = await this.processToolCallsAndContinue(
          result,
          sessionState.currentMessages,
          sessionState.currentTools,
          client
        );
        sessionState.currentMessages = updatedState.messages;
        sessionState.currentTools = updatedState.tools;
        sessionState.iteration++;
      } else {
        const cleanedContent = cleanFinalResponse(result.content);
        return {
          type: 'text' as const,
          content: cleanedContent,
          usedToken: sessionState.totalUsedTokens,
        };
      }
    }

    throw new Error(`Maximum iterations (${this.dispatchConfig.sessionMaxIteration}) reached without final response`);
  }

  protected initializeSession(request: AgentRequest, memory?: MemoryRepository): SessionState {
    return {
      iteration: 1,
      currentMessages: buildOpenAIMessages(request, this.openaiConfig, this.dispatchConfig, 1, memory),
      currentTools: this.buildOpenAITools(request.tools),
      totalUsedTokens: 0,
    };
  }

  protected async executeIteration(
    sessionState: SessionState,
    request: AgentRequest,
    memory?: MemoryRepository
  ): Promise<OpenAIResponse> {
    sessionState.currentMessages[0] = {
      role: 'system',
      content: this.buildSystemContent(request, sessionState.iteration, memory),
    };

    return await this.callOpenAI(sessionState.currentMessages, sessionState.currentTools);
  }

  protected buildSystemContent(
    request: AgentRequest,
    iteration: number,
    memory?: MemoryRepository
  ): string {
    return buildSystemMessage(request, this.openaiConfig, this.dispatchConfig, iteration, memory);
  }

  protected async processToolCallsAndContinue(
    result: OpenAIResponse,
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    client: AgentClient
  ): Promise<ProcessToolCallsResult> {
    if (!result.toolCalls || result.toolCalls.length === 0) {
      throw new Error('processToolCallsAndContinue called without valid tool calls');
    }

    messages.push({
      role: 'assistant',
      content: result.content,
      tool_calls: result.toolCalls,
    });

    const { toolMessages, updatedTools } = await this.executeToolCalls(
      result.toolCalls,
      client,
      tools
    );

    messages.push(...toolMessages);
    return { messages, tools: updatedTools };
  }

  protected buildOpenAITools(tools: AgentTool[]): ChatCompletionTool[] {
    const openAITools = tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    if (this.internalToolHandler) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      openAITools.push(...(this.internalToolHandler.buildTools() as any));
    }

    return openAITools;
  }

  protected async executeToolCalls(
    toolCalls: ChatCompletionMessageToolCall[],
    client: AgentClient,
    currentTools: ChatCompletionTool[]
  ): Promise<ToolExecutionResult> {
    const toolMessages: ChatCompletionMessageParam[] = [];
    let updatedTools = [...currentTools];

    for (const toolCall of toolCalls) {
      const toolResult = await this.executeSingleToolCall(toolCall, client);
      updatedTools = this.handleServerToolsFetch(
        toolCall.function.name,
        toolResult.result,
        updatedTools,
        client
      );
      toolMessages.push({
        role: 'tool',
        content: JSON.stringify(toolResult.result),
        tool_call_id: toolCall.id,
      });
    }

    return { toolMessages, updatedTools };
  }

  protected async executeSingleToolCall(
    toolCall: ChatCompletionMessageToolCall,
    client: AgentClient
  ): Promise<{ result: unknown }> {
    try {
      const functionName = toolCall.function.name;
      const parameters = this.parseToolCallArguments(toolCall.function.arguments, functionName);

      if (this.internalToolHandler && this.internalToolHandler.canHandle(functionName)) {
        const result = await this.internalToolHandler.executeFunction(functionName, parameters);
        return { result };
      }

      const result = await client.callTool(functionName, parameters);
      return { result };
    } catch (error) {
      const errorMessage = `Failed to execute ${toolCall.function.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return {
        result: {
          error: errorMessage,
          toolCallId: toolCall.id,
        },
      };
    }
  }

  protected parseToolCallArguments(
    argumentsString: string,
    functionName: string
  ): JSONObject {
    try {
      return JSON.parse(argumentsString);
    } catch (error) {
      throw new Error(
        `Invalid JSON arguments for tool ${functionName}: ${error instanceof Error ? error.message : 'Parse error'}`
      );
    }
  }

  protected handleServerToolsFetch(
    functionName: string,
    result: unknown,
    currentTools: ChatCompletionTool[],
    client: AgentClient
  ): ChatCompletionTool[] {
    if (functionName !== 'cubicler_fetch_server_tools') {
      return currentTools;
    }
    if (!result || typeof result !== 'object') {
      return currentTools;
    }

    const serverToolsResponse = result as { tools: AgentTool[] };
    if (!serverToolsResponse.tools || !Array.isArray(serverToolsResponse.tools)) {
      return currentTools;
    }

    const newOpenAITools = this.buildOpenAITools(serverToolsResponse.tools);

    if (this.openaiConfig.summarizerModel && this.internalToolHandler) {
      try {
        const summarizerTools = createSummarizerTools(
          serverToolsResponse.tools,
          this.openaiConfig.summarizerModel,
          this.openaiConfig.apiKey,
          client
        );

        const aggregator = this.internalToolHandler as InternalToolAggregator;
        for (const summarizerTool of summarizerTools) {
          aggregator.addTool(summarizerTool);
        }
      } catch {
        // ignore summarizer tool creation errors here
      }
    }

    return [...currentTools, ...newOpenAITools];
  }

  private validateOpenAIRequest(messages: ChatCompletionMessageParam[], tools: ChatCompletionTool[]): void {
    if (!messages || messages.length === 0) {
      throw new Error('OpenAI request requires at least one message');
    }
    if (messages[0]?.role !== 'system') {
      throw new Error('First message must be a system message');
    }
    if (tools && tools.length > 0) {
      for (const tool of tools) {
        if (!tool.function?.name) {
          throw new Error('Invalid tool definition: missing function name');
        }
      }
    }
  }

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
    if (tools.length > 0) {
      requestParams.tools = tools;
    }
    return requestParams;
  }

  private parseOpenAIResponse(response: unknown): OpenAIResponse {
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
      usedTokens,
    };
    if (messageObj.tool_calls) {
      result.toolCalls = messageObj.tool_calls as ChatCompletionMessageToolCall[];
    }
    return result;
  }

  private handleOpenAIError(error: unknown): Error {
    if (error instanceof Error) {
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
}
