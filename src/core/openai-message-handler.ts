import type { AgentClient, RawAgentResponse } from '@cubicler/cubicagentkit';
import type { MessageRequest } from '@cubicler/cubicagentkit/dist/index.d.ts';
import type { MemoryRepository } from '@cubicler/cubicagentkit';
import OpenAI from 'openai';
import type { DispatchConfig, OpenAIConfig } from '../config/environment.js';
import type { InternalToolHandling } from '../internal-tools/internal-tool-handler.interface.js';
import { OpenAIBaseHandler } from './openai-base-handler.js';
import type { OpenAIMessageHandling } from '../models/interfaces.js';

export class OpenAIMessageHandler extends OpenAIBaseHandler implements OpenAIMessageHandling {
  constructor(
    openai: OpenAI,
    openaiConfig: OpenAIConfig,
    dispatchConfig: DispatchConfig,
    internalToolHandler?: InternalToolHandling
  ) {
    super(openai, openaiConfig, dispatchConfig, internalToolHandler);
  }

  async handleMessage(
    request: MessageRequest,
    client: AgentClient,
    context?: { memory?: MemoryRepository }
  ): Promise<RawAgentResponse> {
    return this.executeIterativeLoop(request, client, context?.memory);
  }
}

