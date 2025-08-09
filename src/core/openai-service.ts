import { CubicAgent } from '@cubicler/cubicagentkit';
import type { AgentRequest, AgentResponse } from '@cubicler/cubicagentkit';
import type { OpenAITriggerHandling, OpenAIMessageHandling } from '../models/interfaces.js';
import type { Logger } from '../utils/logger.interface.js';
import { createLogger } from '../utils/pino-logger.js';

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
 * - Support multiple transport modes (HTTP, stdio)
 * - Optional memory integration for context persistence
 */
export class OpenAIService {
  private cubicAgent: CubicAgent;
  private messageHandler: OpenAIMessageHandling;
  private triggerHandler: OpenAITriggerHandling;
  private logger: Logger;

  constructor(
    cubicAgent: CubicAgent,
    messageHandler: OpenAIMessageHandling,
    triggerHandler: OpenAITriggerHandling,
    logger?: Logger
  ) {
    this.cubicAgent = cubicAgent;
    this.messageHandler = messageHandler;
    this.triggerHandler = triggerHandler;
    this.logger = logger ?? createLogger({ silent: true });
  }

  /**
   * Start the CubicAgent (kit will handle MCP initialization automatically)
   */
  async start(): Promise<void> {
    await this.cubicAgent
      .start()
      .onMessage(async (request, client, context) => {
        const agentName = request.agent?.name || 'Unknown Agent';
        const toolsCount = request.tools?.length || 0;
        const messagesCount = request.messages?.length || 0;
        this.logger.info(`📨 ${agentName} | ${toolsCount} tools | ${messagesCount} msgs`);
        try {
          const ctx = context.memory ? { memory: context.memory } : undefined;
          return await this.messageHandler.handleMessage(request, client, ctx);
        } catch (error) {
          this.logger.error(`❌ Message handler failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return { type: 'text' as const, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, usedToken: 0 };
        }
      })
      .onTrigger(async (request, client, context) => {
        const agentName = request.agent?.name || 'Unknown Agent';
        const toolsCount = request.tools?.length || 0;
        const triggerName = request.trigger?.identifier || 'unknown';
        this.logger.info(`🪝 ${agentName} | ${toolsCount} tools | trigger: ${triggerName}`);
        try {
          const ctx = context.memory ? { memory: context.memory } : undefined;
          return await this.triggerHandler.handleWebhook(request, client, ctx);
        } catch (error) {
          this.logger.error(`❌ Trigger handler failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return { type: 'text' as const, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, usedToken: 0 };
        }
      })
      .listen();
  }

  /**
   * Stop the CubicAgent
   */
  async stop(): Promise<void> {
    await this.cubicAgent.stop();
  }

  async dispatch(request: AgentRequest): Promise<AgentResponse> {
    return await this.cubicAgent.dispatch(request);
  }

  /**
   * Get the underlying CubicAgent instance
   */
  getCubicAgent(): CubicAgent {
    return this.cubicAgent;
  }

}
