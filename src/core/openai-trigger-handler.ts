import type { AgentClient, RawAgentResponse } from '@cubicler/cubicagentkit';
import type { TriggerRequest } from '@cubicler/cubicagentkit/dist/index.d.ts';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import OpenAI from 'openai';
import type { DispatchConfig, OpenAIConfig } from '../config/environment.js';
import type { InternalToolHandling } from '../internal-tools/internal-tool-handler.interface.js';
import { OpenAIBaseHandler } from './openai-base-handler.js';
import type { OpenAITriggerHandling } from '../models/interfaces.js';

export class OpenAITriggerHandler extends OpenAIBaseHandler implements OpenAITriggerHandling {
  constructor(
    openai: OpenAI,
    openaiConfig: OpenAIConfig,
    dispatchConfig: DispatchConfig,
    internalToolHandler?: InternalToolHandling
  ) {
    super(openai, openaiConfig, dispatchConfig, internalToolHandler);
  }

  protected override buildSystemContent(request: TriggerRequest, iteration: number, memory?: MemoryRepository): string {
    const base = super.buildSystemContent(request, iteration, memory);
    const { trigger } = request;
    // Provide additional guidance for trigger-based flows
    const triggerGuide = `\nYou are handling a webhook trigger (identifier: ${trigger.identifier}, name: ${trigger.name}). Analyze the payload and decide which tools to call. If no action is needed, respond concisely.`;
    return base + triggerGuide;
  }

  async handleWebhook(
    request: TriggerRequest,
    client: AgentClient,
    context?: { memory?: MemoryRepository }
  ): Promise<RawAgentResponse> {
    return this.executeIterativeLoop(request, client, context?.memory);
  }
}
