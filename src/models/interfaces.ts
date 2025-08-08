import type { AgentClient, MessageRequest, RawAgentResponse, TriggerRequest } from '@cubicler/cubicagentkit';
import type { MemoryRepository } from '@cubicler/cubicagentkit';

export interface OpenAITriggerHandling {
  handleWebhook(
    request: TriggerRequest,
    client: AgentClient,
    context?: { memory?: MemoryRepository; [key: string]: unknown }
  ): Promise<RawAgentResponse>;
}

export interface OpenAIMessageHandling {
  handleMessage(
    request: MessageRequest,
    client: AgentClient,
    context?: { memory?: MemoryRepository; [key: string]: unknown }
  ): Promise<RawAgentResponse>;
}