import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createOpenAIServiceFromConfig,
  createOpenAIServiceWithMemory,
  createOpenAIServiceBasic
} from '../../src/core/openai-service-factory.js';
import { OpenAIService } from '../../src/core/openai-service.js';

// Mocks for cubicagentkit pieces we need
vi.mock('@cubicler/cubicagentkit', () => ({
  CubicAgent: vi.fn().mockImplementation((client, server, memory) => ({
    client,
    server,
    memory,
    start: vi.fn(),
    stop: vi.fn(),
    dispatch: vi.fn()
  })),
  HttpAgentClient: vi.fn().mockImplementation((url) => ({ url })),
  HttpAgentServer: vi.fn().mockImplementation((port, endpoint) => ({ port, endpoint })),
  createDefaultMemoryRepository: vi.fn().mockResolvedValue({ type: 'in-memory' })
}));

// Mock handlers & OpenAI client internals indirectly used
vi.mock('openai', () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock('../../src/core/openai-message-handler.js', () => ({
  OpenAIMessageHandler: vi.fn().mockImplementation(() => ({ marker: 'messageHandler' }))
}));
vi.mock('../../src/core/openai-trigger-handler.js', () => ({
  OpenAITriggerHandler: vi.fn().mockImplementation(() => ({ marker: 'triggerHandler' }))
}));
vi.mock('../../src/core/internal-tool-aggregator.js', () => ({
  InternalToolAggregator: vi.fn().mockImplementation((tools) => ({ tools }))
}));

// Memory tools (only to satisfy factory when memory provided)
vi.mock('../../src/internal-tools/memory/memory-remember-tool.js', () => ({ MemoryRememberTool: vi.fn().mockImplementation(() => ({ toolName: 'remember' })) }));
vi.mock('../../src/internal-tools/memory/memory-recall-tool.js', () => ({ MemoryRecallTool: vi.fn().mockImplementation(() => ({ toolName: 'recall' })) }));
vi.mock('../../src/internal-tools/memory/memory-search-tool.js', () => ({ MemorySearchTool: vi.fn().mockImplementation(() => ({ toolName: 'search' })) }));
vi.mock('../../src/internal-tools/memory/memory-forget-tool.js', () => ({ MemoryForgetTool: vi.fn().mockImplementation(() => ({ toolName: 'forget' })) }));
vi.mock('../../src/internal-tools/memory/memory-get-short-term-tool.js', () => ({ MemoryGetShortTermTool: vi.fn().mockImplementation(() => ({ toolName: 'get_short' })) }));
vi.mock('../../src/internal-tools/memory/memory-add-to-short-term-tool.js', () => ({ MemoryAddToShortTermTool: vi.fn().mockImplementation(() => ({ toolName: 'add_short' })) }));
vi.mock('../../src/internal-tools/memory/memory-edit-importance-tool.js', () => ({ MemoryEditImportanceTool: vi.fn().mockImplementation(() => ({ toolName: 'edit_importance' })) }));
vi.mock('../../src/internal-tools/memory/memory-edit-content-tool.js', () => ({ MemoryEditContentTool: vi.fn().mockImplementation(() => ({ toolName: 'edit_content' })) }));
vi.mock('../../src/internal-tools/memory/memory-add-tag-tool.js', () => ({ MemoryAddTagTool: vi.fn().mockImplementation(() => ({ toolName: 'add_tag' })) }));
vi.mock('../../src/internal-tools/memory/memory-remove-tag-tool.js', () => ({ MemoryRemoveTagTool: vi.fn().mockImplementation(() => ({ toolName: 'remove_tag' })) }));
vi.mock('../../src/internal-tools/memory/memory-replace-tags-tool.js', () => ({ MemoryReplaceTagsTool: vi.fn().mockImplementation(() => ({ toolName: 'replace_tags' })) }));

const baseOpenAIConfig = {
  apiKey: 'test-key',
  model: 'gpt-4',
  temperature: 0.7,
  sessionMaxTokens: 4096
} as any;

const baseDispatchConfig = {
  timeout: 30000,
  mcpMaxRetries: 3,
  mcpCallTimeout: 10000,
  sessionMaxIteration: 10,
  endpoint: '/',
  agentPort: 3000
} as any;

describe('Additional Factory Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createOpenAIServiceFromConfig creates a service (http transport)', async () => {
    const config = {
      openai: baseOpenAIConfig,
      dispatch: baseDispatchConfig,
      transport: { mode: 'http', cubiclerUrl: 'http://localhost:8080' },
      memory: { enabled: false },
      jwt: { enabled: false, type: 'static', algorithms: ['HS256'], ignoreExpiration: false, grantType: 'client_credentials' }
    } as any;

    const service = await createOpenAIServiceFromConfig(config);
    expect(service).toBeInstanceOf(OpenAIService);
  });

  it('createOpenAIServiceWithMemory wires custom memory + transport', () => {
    const mockClient: any = { kind: 'client' };
    const mockServer: any = { kind: 'server' };
    const mockMemory: any = { kind: 'memory' };

    const service = createOpenAIServiceWithMemory(
      mockClient,
      mockServer,
      mockMemory,
      baseOpenAIConfig,
      baseDispatchConfig
    );
    expect(service).toBeInstanceOf(OpenAIService);
  });

  it('createOpenAIServiceBasic creates service without memory', () => {
    const mockClient: any = { basic: true };
    const mockServer: any = { basic: true };

    const service = createOpenAIServiceBasic(
      mockClient,
      mockServer,
      baseOpenAIConfig,
      baseDispatchConfig
    );
    expect(service).toBeInstanceOf(OpenAIService);
  });
});
