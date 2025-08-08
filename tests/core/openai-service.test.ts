import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIService } from '../../src/core/openai-service.js';

describe('OpenAIService (builder + delegation)', () => {
  const mockOnMessage = vi.fn();
  const mockOnTrigger = vi.fn();
  const mockListen = vi.fn();
  let capturedMessageHandler: any;
  let capturedTriggerHandler: any;

  const builder = {
    onMessage: (fn: any) => {
      capturedMessageHandler = fn;
      mockOnMessage(fn);
      return builder;
    },
    onTrigger: (fn: any) => {
      capturedTriggerHandler = fn;
      mockOnTrigger(fn);
      return builder;
    },
    listen: mockListen
  } as any;

  const cubicAgent = {
    start: vi.fn(() => builder),
    stop: vi.fn(),
    dispatch: vi.fn()
  } as any;

  const messageHandler = { handleMessage: vi.fn() } as any;
  const triggerHandler = { handleWebhook: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wires builder: onMessage, onTrigger, listen', async () => {
    const service = new OpenAIService(cubicAgent, messageHandler, triggerHandler);
    await service.start();

    expect(cubicAgent.start).toHaveBeenCalled();
    expect(mockOnMessage).toHaveBeenCalledTimes(1);
    expect(mockOnTrigger).toHaveBeenCalledTimes(1);
    expect(mockListen).toHaveBeenCalledTimes(1);
  });

  it('delegates to message handler', async () => {
    const service = new OpenAIService(cubicAgent, messageHandler, triggerHandler);
    await service.start();

    const request = { agent: { name: 'a', identifier: 'a', description: '', prompt: '' }, tools: [], servers: [], messages: [] } as any;
    const client = {} as any;
    const context = { memory: {} } as any;

    messageHandler.handleMessage.mockResolvedValue({ type: 'text', content: 'ok', usedToken: 1 });

    const result = await capturedMessageHandler(request, client, context);

    expect(messageHandler.handleMessage).toHaveBeenCalledWith(request, client, { memory: context.memory });
    expect(result).toEqual({ type: 'text', content: 'ok', usedToken: 1 });
  });

  it('delegates to trigger handler', async () => {
    const service = new OpenAIService(cubicAgent, messageHandler, triggerHandler);
    await service.start();

    const request = { agent: { name: 'a', identifier: 'a', description: '', prompt: '' }, tools: [], servers: [], trigger: { type: 'webhook', identifier: 'id', name: 'n', description: '', triggeredAt: new Date().toISOString(), payload: null } } as any;
    const client = {} as any;
    const context = { memory: {} } as any;

    triggerHandler.handleWebhook.mockResolvedValue({ type: 'text', content: 'ok', usedToken: 2 });

    const result = await capturedTriggerHandler(request, client, context);

    expect(triggerHandler.handleWebhook).toHaveBeenCalledWith(request, client, { memory: context.memory });
    expect(result).toEqual({ type: 'text', content: 'ok', usedToken: 2 });
  });

  it('dispatch proxies to cubicAgent', async () => {
    const service = new OpenAIService(cubicAgent, messageHandler, triggerHandler);
    const req = { agent: { name: 'a', identifier: 'a', description: '', prompt: '' }, tools: [], servers: [], messages: [] } as any;
    const resp = { type: 'text', content: 'done', timestamp: '', metadata: { usedTools: 0, usedToken: 0 } } as any;
    cubicAgent.dispatch.mockResolvedValue(resp);

    const result = await service.dispatch(req);
    expect(cubicAgent.dispatch).toHaveBeenCalledWith(req);
    expect(result).toBe(resp);
  });

  it('stop proxies to cubicAgent', async () => {
    const service = new OpenAIService(cubicAgent, messageHandler, triggerHandler);
    await service.stop();
    expect(cubicAgent.stop).toHaveBeenCalled();
  });
});

