import { CubicAgent, CubiclerClient, type AgentRequest, type CallContext, type AgentFunctionDefinition, type FunctionCallResult, type JSONObject } from '@cubicler/cubicagentkit';
import OpenAI from 'openai';
import { 
  convertToOpenAIMessages,
  createGetProviderSpecFunction,
  convertAgentFunctionsToOpenAI,
  cleanChatGPTResponse
} from './utils/openai-helper.js';

/**
 * Configuration for OpenAI Cubic Agent
 */
export interface OpenAIAgentConfig {
  agentPort: number;
  agentName: string;
  openaiApiKey: string;
  openaiModel: string;
  agentTemperature: number;
  maxTokens: number;
  cubiclerUrl: string;
  agentTimeout: number;
  agentMaxRetries: number;
  maxFunctionIterations: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Provider state tracking
 */
interface ProviderState {
  loaded: boolean;
  functions: AgentFunctionDefinition[];
}

/**
 * OpenAI Cubic Agent
 * Encapsulates CubicAgent with OpenAI integration
 */
export class OpenAICubicAgent {
  private cubicAgent: CubicAgent;
  private openai: OpenAI;
  private config: OpenAIAgentConfig;

  constructor(config: OpenAIAgentConfig) {
    this.config = config;
    
    this.validateConfig();

    this.openai = new OpenAI({
      apiKey: this.config.openaiApiKey,
    });

    const cubiclerClient = new CubiclerClient(
      this.config.cubiclerUrl,
      this.config.agentTimeout,
      this.config.agentMaxRetries
    );

    this.cubicAgent = new CubicAgent({
      port: this.config.agentPort,
      agentName: this.config.agentName,
      logLevel: this.config.logLevel || 'info',
      cubiclerClient
    });

    this.cubicAgent.onCall(this.handleCall.bind(this));
  }

  /**
   * Validates the configuration
   */
  private validateConfig(): void {
    const required = ['openaiApiKey', 'agentName'];
    const missing = required.filter(key => !this.config[key as keyof OpenAIAgentConfig]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * Enhanced handleCall with function calling loop
   */
  private async handleCall(request: AgentRequest, context: CallContext): Promise<string> {
    try {
      console.log(`[${this.config.agentName}] Processing request with ${request.messages?.length || 0} messages`);

      // Execute function calling loop
      return await this.executeFunctionCallingLoop(
        request,
        context
      );

    } catch (error) {
      console.error(`[${this.config.agentName}] Error processing request:`, error);
      
      if (error instanceof Error) {
        throw new Error(`OpenAI Agent Error: ${error.message}`);
      } else {
        throw new Error('OpenAI Agent Error: Unknown error occurred');
      }
    }
  }

  /**
   * Executes the function calling loop with OpenAI
   */
  private async executeFunctionCallingLoop(
    request: AgentRequest,
    context: CallContext
  ): Promise<string> {
    const maxIterations = this.config.maxFunctionIterations; // Prevent infinite loops
    let iteration = 0;
    
    const providerState = new Map<string, ProviderState>();
    const availableFunctions = new Map<string, OpenAI.Chat.Completions.ChatCompletionTool>();
    
    for (const provider of request.providers || []) {
      providerState.set(provider.name, { loaded: false, functions: [] });
    }
    
    // Add getProviderSpec function to available functions if providers are available
    if (providerState.size > 0) {
      const getProviderSpecTool = createGetProviderSpecFunction(Array.from(providerState.keys()));
      availableFunctions.set('getProviderSpec', getProviderSpecTool);
    }

    const conversationMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    
    while (iteration < maxIterations) {
      iteration++;
      console.log(`[${this.config.agentName}] Function calling iteration ${iteration}`);

      // Convert messages to OpenAI format with current iteration info
      const messages = convertToOpenAIMessages(request, this.config.agentName, iteration, maxIterations);
      
      // Add previous conversation messages (excluding the system message)
      const fullMessages = [...messages.slice(0, 1), ...conversationMessages, ...messages.slice(1)];

      const startTime = Date.now();
      
      const completionRequest: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model: this.config.openaiModel,
        messages: fullMessages,
        temperature: this.config.agentTemperature,
        max_tokens: this.config.maxTokens,
      };

      // Build tools array from available functions (includes getProviderSpec + provider functions)
      const allTools = Array.from(availableFunctions.values());

      // Add tools if available
      if (allTools.length > 0) {
        completionRequest.tools = allTools;
        completionRequest.tool_choice = 'auto';
      }

      const completion = await this.openai.chat.completions.create(completionRequest) as OpenAI.Chat.Completions.ChatCompletion;

      const latency = Date.now() - startTime;
      console.log(`[${this.config.agentName}] OpenAI API call ${iteration} completed in ${latency}ms`);

      const choice = completion.choices[0];
      if (!choice) {
        throw new Error('OpenAI returned no choices');
      }

      const message = choice.message;
      
      // Add assistant's message to conversation
      conversationMessages.push({
        role: 'assistant',
        content: message.content,
        tool_calls: message.tool_calls
      });

      // Check if GPT wants to call functions
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`[${this.config.agentName}] Processing ${message.tool_calls.length} function calls`);
        
        // Process each function call and get results
        const toolResults = await this.processFunctionCalls(
          message.tool_calls,
          providerState,
          availableFunctions,
          context
        );
        
        // Add tool results to conversation
        for (const toolResult of toolResults) {
          conversationMessages.push(toolResult);
        }
        
        // Continue the loop to let GPT process the function results
        continue;
      } else {
        // GPT returned a final message without function calls
        const finalMessage = message.content;
        
        if (!finalMessage) {
          throw new Error('OpenAI returned empty final message');
        }

        console.log(`[${this.config.agentName}] Function calling completed after ${iteration} iterations`);
        
        // Clean the response to remove any unwanted prefixes
        const cleanedMessage = cleanChatGPTResponse(finalMessage);
        return cleanedMessage;
      }
    }
    
    // Exit the loop due to max iterations
    throw new Error(`Function calling loop exceeded maximum iterations (${maxIterations})`);
  }

  /**
   * Processes all function calls from OpenAI
   */
  private async processFunctionCalls(
    toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
    providerState: Map<string, ProviderState>,
    availableFunctions: Map<string, OpenAI.Chat.Completions.ChatCompletionTool>,
    context: CallContext
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
    const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    
    for (const toolCall of toolCalls) {
      if (toolCall.type === 'function') {
        const functionName = toolCall.function.name;
        // Parse function arguments with proper error handling
        let functionArgs: JSONObject;
        try {
          functionArgs = JSON.parse(toolCall.function.arguments) as JSONObject;
        } catch (error) {
          throw new Error(`Invalid JSON in function arguments: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        console.log(`[${this.config.agentName}] Calling function: ${functionName}`, functionArgs);

        const functionResult = await this.executeFunction(
          functionName,
          functionArgs,
          providerState,
          availableFunctions,
          context
        );

        toolResults.push({
          role: 'tool',
          content: JSON.stringify(functionResult),
          tool_call_id: toolCall.id
        });
      }
    }
    
    return toolResults;
  }

  /**
   * Executes a function call (either getProviderSpec or regular function)
   */
  private async executeFunction(
    functionName: string,
    functionArgs: JSONObject,
    providerState: Map<string, ProviderState>,
    availableFunctions: Map<string, OpenAI.Chat.Completions.ChatCompletionTool>,
    context: CallContext
  ): Promise<FunctionCallResult> {
    if (functionName === 'getProviderSpec') {
      return await this.handleGetProviderSpecCall(
        functionArgs,
        providerState,
        availableFunctions,
        context
      );
    } else {
      return await this.handleRegularFunctionCall(
        functionName,
        functionArgs,
        availableFunctions,
        context
      );
    }
  }

  /**
   * Handles getProviderSpec function calls
   */
  private async handleGetProviderSpecCall(
    functionArgs: JSONObject,
    providerState: Map<string, ProviderState>,
    availableFunctions: Map<string, OpenAI.Chat.Completions.ChatCompletionTool>,
    context: CallContext
  ): Promise<JSONObject> {
    const providerName = functionArgs.providerName;
    
    // Type guard to ensure providerName is a string
    if (typeof providerName !== 'string') {
      return { error: 'Provider name must be a string' };
    }
    
    const availableProviders = Array.from(providerState.keys());
    if (!availableProviders.includes(providerName)) {
      return { error: `Provider "${providerName}" is not available` };
    }

    try {
      const providerSpec = await context.getProviderSpec(providerName);
      // Use the proper types from the SDK
      const functionResult: JSONObject = {
        context: providerSpec.context,
        functions: providerSpec.functions as unknown as JSONObject
      };
      
      const state = providerState.get(providerName);
      if (!state) {
        providerState.set(providerName, { loaded: false, functions: [] });
      }
      
      // Add provider functions to available tools (only if not already loaded)
      if (!state?.loaded || !providerState.get(providerName)?.loaded) {
        // Mark as loaded and store functions
        providerState.set(providerName, { loaded: true, functions: providerSpec.functions });
        
        // Convert and add functions to available functions map
        const newTools = convertAgentFunctionsToOpenAI(providerSpec.functions);
        for (const tool of newTools) {
          availableFunctions.set(tool.function.name, tool);
        }
        
        console.log(`[${this.config.agentName}] Loaded ${providerSpec.functions.length} functions from provider: ${providerName}`);
        console.log(`[${this.config.agentName}] Added context from provider: ${providerName}`);
      }

      return functionResult;
    } catch (error) {
      return { error: `Failed to get provider spec: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Handles regular function calls (non-getProviderSpec)
   */
  private async handleRegularFunctionCall(
    functionName: string,
    functionArgs: JSONObject,
    availableFunctions: Map<string, OpenAI.Chat.Completions.ChatCompletionTool>,
    context: CallContext
  ): Promise<FunctionCallResult> {
    if (availableFunctions.has(functionName)) {
      try {
        return await context.executeFunction(functionName, functionArgs);
      } catch (error) {
        return { error: `Function execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
      }
    } else {
      return { error: `Function "${functionName}" is not available` };
    }
  }

  /**
   * Start the agent
   */
  start(callback?: () => void): void {
    this.cubicAgent.start(() => {
      console.log(`🚀 ${this.config.agentName} is running on port ${this.config.agentPort}`);
      console.log(`📡 Connected to Cubicler at ${this.config.cubiclerUrl}`);
      console.log(`🤖 Using OpenAI model: ${this.config.openaiModel}`);
      
      if (callback) {
        callback();
      }
    });
  }

  /**
   * Stop the agent
   */
  stop(): void {
    this.cubicAgent.stop();
  }

  /**
   * Get the underlying CubicAgent instance
   */
  getCubicAgent(): CubicAgent {
    return this.cubicAgent;
  }
}
