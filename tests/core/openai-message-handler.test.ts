import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OpenAI from 'openai';
// Adjust relative paths (one too many ../ levels previously)
import { OpenAIMessageHandler } from '../../src/core/openai-message-handler.js';
import type { DispatchConfig, OpenAIConfig } from '../../src/config/environment.js';

vi.mock('openai');

describe('OpenAIMessageHandler (core loop + tools)', () => {
  let handler: OpenAIMessageHandler;
  let mockOpenAI: any;
  let mockOpenAIConfig: OpenAIConfig;
  let mockDispatchConfig: DispatchConfig;
  const client = { callTool: vi.fn(), initialize: vi.fn() } as any;

  const request = {
    agent: { identifier: 'agent', name: 'Agent', description: '', prompt: 'p' },
    tools: [],
    servers: [],
    messages: [
      { type: 'text', sender: { id: 'u' }, content: 'hi' }
    ]
  } as any;

  beforeEach(() => {
    mockOpenAIConfig = {
      apiKey: 'x', model: 'gpt-4o', temperature: 0.7, sessionMaxTokens: 1024,
      timeout: 60000, maxRetries: 2
    } as any;
    mockDispatchConfig = {
      timeout: 30000, mcpMaxRetries: 3, mcpCallTimeout: 10000, sessionMaxIteration: 5, endpoint: '/', agentPort: 3000
    };

    mockOpenAI = { chat: { completions: { create: vi.fn() } } };
    (OpenAI as any).mockImplementation(() => mockOpenAI);
    const openai = new (OpenAI as any)();
    handler = new OpenAIMessageHandler(openai, mockOpenAIConfig, mockDispatchConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls OpenAI and returns final text', async () => {
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Final', tool_calls: undefined } }],
      usage: { total_tokens: 10 }
    });
    const res = await handler.handleMessage(request, client, {});
    expect(res).toEqual({ type: 'text', content: 'Final', usedToken: 10 });
  });

  it('handles tool calls and returns tool results flow', async () => {
    const toolCalls = [{ id: '1', type: 'function', function: { name: 'tool', arguments: '{"x":1}' } }];
    mockOpenAI.chat.completions.create
      .mockResolvedValueOnce({ choices: [{ message: { content: null, tool_calls: toolCalls } }], usage: { total_tokens: 5 } })
      .mockResolvedValueOnce({ choices: [{ message: { content: 'Done', tool_calls: undefined } }], usage: { total_tokens: 7 } });
    client.callTool.mockResolvedValueOnce({ ok: true });
    const res = await handler.handleMessage(request, client, {});
    expect(client.callTool).toHaveBeenCalledWith('tool', { x: 1 });
    expect(res).toEqual({ type: 'text', content: 'Done', usedToken: 12 });
  });
});

