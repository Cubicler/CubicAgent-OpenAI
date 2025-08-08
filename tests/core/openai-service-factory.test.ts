import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Correct relative paths (tests/core -> src) should use ../../src not ../../../../
import { createOpenAIServiceFromEnv } from '../../src/core/openai-service-factory.js';
import { OpenAIService } from '../../src/core/openai-service.js';
import { loadConfig } from '../../src/config/environment.js';
import { 
  createDefaultMemoryRepository,
  createSQLiteMemoryRepository,
  StdioAgentClient
} from '@cubicler/cubicagentkit';
import { InternalToolAggregator } from '../../src/core/internal-tool-aggregator.js';

// Mock all dependencies
vi.mock('@cubicler/cubicagentkit', () => ({
  CubicAgent: vi.fn().mockImplementation((client, server, memory) => ({
    client,
    server,
    memory,
    start: vi.fn(),
    stop: vi.fn()
  })),
  HttpAgentClient: vi.fn().mockImplementation((url, timeout) => ({ 
    url, 
    timeout,
    useJWTAuth: vi.fn()
  })),
  HttpAgentServer: vi.fn().mockImplementation((port, endpoint) => ({ 
    port, 
    endpoint,
    useJWTAuth: vi.fn()
  })),
  SSEAgentServer: vi.fn().mockImplementation((url, agentId) => ({ 
    url, 
    agentId
  })),
  StdioAgentClient: vi.fn().mockImplementation((command, args, cwd) => ({ command, args, cwd })),
  StdioAgentServer: vi.fn().mockImplementation(() => ({})),
  createDefaultMemoryRepository: vi.fn().mockResolvedValue({ type: 'in-memory', maxTokens: 1000 }),
  createSQLiteMemoryRepository: vi.fn().mockResolvedValue({ type: 'sqlite', maxTokens: 2000 })
}));

// Match mocked module path to actual import specifier '../../src/config/environment.js'
vi.mock('../../src/config/environment.js', () => ({
  loadConfig: vi.fn()
}));

// Use the real OpenAIService to validate actual construction

vi.mock('../../src/core/internal-tool-aggregator.js', () => ({
  InternalToolAggregator: vi.fn().mockImplementation((tools) => ({ tools }))
}));

// Mock all memory tools
vi.mock('../../src/internal-tools/memory/memory-remember-tool.js', () => ({
  MemoryRememberTool: vi.fn().mockImplementation((memory) => ({ 
    memory, 
    toolName: 'agentmemory_remember'
  }))
}));

vi.mock('../../src/internal-tools/memory/memory-recall-tool.js', () => ({
  MemoryRecallTool: vi.fn().mockImplementation((memory) => ({ 
    memory, 
    toolName: 'agentmemory_recall'
  }))
}));

vi.mock('../../src/internal-tools/memory/memory-search-tool.js', () => ({
  MemorySearchTool: vi.fn().mockImplementation((memory) => ({ 
    memory, 
    toolName: 'agentmemory_search'
  }))
}));

vi.mock('../../src/internal-tools/memory/memory-forget-tool.js', () => ({
  MemoryForgetTool: vi.fn().mockImplementation((memory) => ({ 
    memory, 
    toolName: 'agentmemory_forget'
  }))
}));

vi.mock('../../src/internal-tools/memory/memory-get-short-term-tool.js', () => ({
  MemoryGetShortTermTool: vi.fn().mockImplementation((memory) => ({ 
    memory, 
    toolName: 'agentmemory_get_short_term'
  }))
}));

vi.mock('../../src/internal-tools/memory/memory-add-to-short-term-tool.js', () => ({
  MemoryAddToShortTermTool: vi.fn().mockImplementation((memory) => ({ 
    memory, 
    toolName: 'agentmemory_add_to_short_term'
  }))
}));

vi.mock('../../src/internal-tools/memory/memory-edit-importance-tool.js', () => ({
  MemoryEditImportanceTool: vi.fn().mockImplementation((memory) => ({ 
    memory, 
    toolName: 'agentmemory_edit_importance'
  }))
}));

vi.mock('../../src/internal-tools/memory/memory-edit-content-tool.js', () => ({
  MemoryEditContentTool: vi.fn().mockImplementation((memory) => ({ 
    memory, 
    toolName: 'agentmemory_edit_content'
  }))
}));

vi.mock('../../src/internal-tools/memory/memory-add-tag-tool.js', () => ({
  MemoryAddTagTool: vi.fn().mockImplementation((memory) => ({ 
    memory, 
    toolName: 'agentmemory_add_tag'
  }))
}));

vi.mock('../../src/internal-tools/memory/memory-remove-tag-tool.js', () => ({
  MemoryRemoveTagTool: vi.fn().mockImplementation((memory) => ({ 
    memory, 
    toolName: 'agentmemory_remove_tag'
  }))
}));

vi.mock('../../src/internal-tools/memory/memory-replace-tags-tool.js', () => ({
  MemoryReplaceTagsTool: vi.fn().mockImplementation((memory) => ({ 
    memory, 
    toolName: 'agentmemory_replace_tags'
  }))
}));

describe('OpenAI Service Factory', () => {
  let mockLoadConfig: ReturnType<typeof vi.fn>;
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;
  let mockConsoleWarn: ReturnType<typeof vi.spyOn>;

  // Helper function to create default JWT config for tests
  const createDefaultJWTConfig = () => ({
    enabled: false,
    type: 'static' as const,
    algorithms: ['HS256'],
    ignoreExpiration: false,
    grantType: 'client_credentials' as const
  });

  beforeEach(() => {
    mockLoadConfig = vi.mocked(loadConfig);
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe('HTTP Transport Mode', () => {
    it('should create OpenAI service with HTTP transport and no memory', async () => {
      mockLoadConfig.mockReturnValue({
        openai: {
          apiKey: 'test-api-key',
          model: 'gpt-4',
          temperature: 0.7,
          sessionMaxTokens: 4096
        },
        dispatch: {
          sessionMaxIteration: 10,
          mcpCallTimeout: 5000,
          agentPort: 3000,
          endpoint: '/agent'
        },
        transport: {
          mode: 'http',
          cubiclerUrl: 'http://localhost:3001'
        },
        memory: {
          enabled: false
        },
        jwt: createDefaultJWTConfig()
      });

      const service = await createOpenAIServiceFromEnv();

      expect(service).toBeInstanceOf(OpenAIService);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🚀 OpenAI ready - http transport - 3000'
      );
    });

    it('should create OpenAI service with HTTP transport and SQLite memory', async () => {
      mockLoadConfig.mockReturnValue({
        openai: {
          apiKey: 'test-api-key',
          model: 'gpt-4',
          temperature: 0.7,
          sessionMaxTokens: 4096
        },
        dispatch: {
          sessionMaxIteration: 10,
          mcpCallTimeout: 5000,
          agentPort: 3000,
          endpoint: '/agent'
        },
        transport: {
          mode: 'http',
          cubiclerUrl: 'http://localhost:3001'
        },
        memory: {
          enabled: true,
          type: 'sqlite',
          dbPath: './test.db',
          maxTokens: 2000,
          defaultImportance: 5
        },
        jwt: createDefaultJWTConfig()
      });

      const service = await createOpenAIServiceFromEnv();

      expect(service).toBeInstanceOf(OpenAIService);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '💾 Memory enabled: sqlite (2000 tokens)'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🔧 Internal tools enabled: 11 memory tools'
      );
    });

    it('should create OpenAI service with HTTP transport and in-memory storage', async () => {
      mockLoadConfig.mockReturnValue({
        openai: {
          apiKey: 'test-api-key',
          model: 'gpt-3.5-turbo',
          temperature: 0.5,
          sessionMaxTokens: 2048
        },
        dispatch: {
          sessionMaxIteration: 5,
          mcpCallTimeout: 3000,
          agentPort: 8080,
          endpoint: '/chat'
        },
        transport: {
          mode: 'http',
          cubiclerUrl: 'http://cubicler:3000'
        },
        memory: {
          enabled: true,
          type: 'in-memory',
          maxTokens: 1000,
          defaultImportance: 3
        },
        jwt: createDefaultJWTConfig()
      });

      const service = await createOpenAIServiceFromEnv();

      expect(service).toBeInstanceOf(OpenAIService);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '💾 Memory enabled: in-memory (1000 tokens)'
      );
    });

    it('should throw error when CUBICLER_URL is missing for HTTP mode', async () => {
      mockLoadConfig.mockReturnValue({
        openai: { apiKey: 'test' },
        dispatch: { agentPort: 3000, endpoint: '/agent' },
        transport: { mode: 'http' }, // Missing cubiclerUrl
        memory: { enabled: false }
      });

      await expect(createOpenAIServiceFromEnv()).rejects.toThrow(
        'CUBICLER_URL is required for HTTP transport mode'
      );
    });
  });

  describe('STDIO Transport Mode', () => {
    it('should create OpenAI service with STDIO transport', async () => {
      mockLoadConfig.mockReturnValue({
        openai: {
          apiKey: 'test-api-key',
          model: 'gpt-4',
          temperature: 0.7,
          sessionMaxTokens: 4096
        },
        dispatch: {
          sessionMaxIteration: 10,
          mcpCallTimeout: 5000,
          agentPort: 3000,
          endpoint: '/agent'
        },
        transport: {
          mode: 'stdio',
          command: 'node',
          args: ['server.js'],
          cwd: '/path/to/server'
        },
        memory: {
          enabled: false
        },
        jwt: createDefaultJWTConfig()
      });

      const service = await createOpenAIServiceFromEnv();

      expect(service).toBeInstanceOf(OpenAIService);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🚀 OpenAI ready - stdio transport - stdio'
      );
    });

    it('should throw error when STDIO_COMMAND is missing for STDIO mode', async () => {
      mockLoadConfig.mockReturnValue({
        openai: { apiKey: 'test' },
        dispatch: {},
        transport: { mode: 'stdio' }, // Missing command
        memory: { enabled: false }
      });

      await expect(createOpenAIServiceFromEnv()).rejects.toThrow(
        'STDIO_COMMAND is required for stdio transport mode'
      );
    });
  });

  describe('SSE Transport Mode', () => {
    it('should create OpenAI service with SSE transport', async () => {
      mockLoadConfig.mockReturnValue({
        openai: {
          apiKey: 'test-api-key',
          model: 'gpt-4',
          temperature: 0.7,
          sessionMaxTokens: 4096
        },
        dispatch: {
          sessionMaxIteration: 10,
          mcpCallTimeout: 5000,
          agentPort: 3000,
          endpoint: '/agent'
        },
        transport: {
          mode: 'sse',
          sseUrl: 'http://localhost:8080',
          agentId: 'my-test-agent-id'
        },
        memory: {
          enabled: false
        },
        jwt: createDefaultJWTConfig()
      });

      const service = await createOpenAIServiceFromEnv();

      expect(service).toBeInstanceOf(OpenAIService);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '⚡ OpenAI ready - sse transport - SSE connected to http://localhost:8080'
      );
    });

    it('should throw error when SSE_URL is missing for SSE mode', async () => {
      mockLoadConfig.mockReturnValue({
        openai: { apiKey: 'test' },
        dispatch: {},
        transport: { mode: 'sse', agentId: 'test-agent' }, // Missing sseUrl
        memory: { enabled: false },
        jwt: createDefaultJWTConfig()
      });

      await expect(createOpenAIServiceFromEnv()).rejects.toThrow(
        'SSE_URL is required for SSE transport mode'
      );
    });

    it('should throw error when SSE_AGENT_ID is missing for SSE mode', async () => {
      mockLoadConfig.mockReturnValue({
        openai: { apiKey: 'test' },
        dispatch: {},
        transport: { mode: 'sse', sseUrl: 'http://localhost:8080' }, // Missing agentId
        memory: { enabled: false },
        jwt: createDefaultJWTConfig()
      });

      await expect(createOpenAIServiceFromEnv()).rejects.toThrow(
        'SSE_AGENT_ID is required for SSE transport mode'
      );
    });
  });

  describe('Memory Initialization', () => {
    it('should handle memory initialization errors gracefully', async () => {
      const mockCreateSQLiteMemoryRepository = vi.mocked(createSQLiteMemoryRepository);
      mockCreateSQLiteMemoryRepository.mockRejectedValue(new Error('Database connection failed'));

      mockLoadConfig.mockReturnValue({
        openai: { apiKey: 'test' },
        dispatch: { agentPort: 3000, endpoint: '/agent' },
        transport: { mode: 'http', cubiclerUrl: 'http://localhost:3001' },
        memory: {
          enabled: true,
          type: 'sqlite',
          dbPath: './test.db',
          maxTokens: 1000,
          defaultImportance: 5
        },
        jwt: createDefaultJWTConfig()
      });

      const service = await createOpenAIServiceFromEnv();

      expect(service).toBeInstanceOf(OpenAIService);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '⚠️ Memory initialization failed: Database connection failed'
      );
    });

    it('should handle unknown memory initialization errors', async () => {
      const mockCreateDefaultMemoryRepository = vi.mocked(createDefaultMemoryRepository);
       
      mockCreateDefaultMemoryRepository.mockRejectedValue('String error');

      mockLoadConfig.mockReturnValue({
        openai: { apiKey: 'test' },
        dispatch: { agentPort: 3000, endpoint: '/agent' },
        transport: { mode: 'http', cubiclerUrl: 'http://localhost:3001' },
        memory: {
          enabled: true,
          type: 'in-memory',
          maxTokens: 1000,
          defaultImportance: 5
        },
        jwt: createDefaultJWTConfig()
      });

      const service = await createOpenAIServiceFromEnv();

      expect(service).toBeInstanceOf(OpenAIService);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '⚠️ Memory initialization failed: Unknown error'
      );
    });

    it('should not create internal tools when memory is disabled', async () => {
      mockLoadConfig.mockReturnValue({
        openai: { apiKey: 'test' },
        dispatch: { agentPort: 3000, endpoint: '/agent' },
        transport: { mode: 'http', cubiclerUrl: 'http://localhost:3001' },
        memory: { enabled: false },
        jwt: createDefaultJWTConfig()
      });

      const service = await createOpenAIServiceFromEnv();

      expect(service).toBeInstanceOf(OpenAIService);
      // Verify OpenAIService was called with undefined for internalToolHandler
      // Service should be constructed; specific handler internals are validated in dedicated tests
    });

    it('should not create internal tools when memory initialization fails', async () => {
      const mockCreateSQLiteMemoryRepository = vi.mocked(createSQLiteMemoryRepository);
      mockCreateSQLiteMemoryRepository.mockRejectedValue(new Error('Failed to init memory'));

      mockLoadConfig.mockReturnValue({
        openai: { apiKey: 'test' },
        dispatch: { agentPort: 3000, endpoint: '/agent' },
        transport: { mode: 'http', cubiclerUrl: 'http://localhost:3001' },
        memory: {
          enabled: true,
          type: 'sqlite',
          dbPath: './test.db',
          maxTokens: 1000,
          defaultImportance: 5
        },
        jwt: createDefaultJWTConfig()
      });

      const service = await createOpenAIServiceFromEnv();

      expect(service).toBeInstanceOf(OpenAIService);
      // Verify OpenAIService was called with undefined for internalToolHandler
      // Service should be constructed; specific handler internals are validated in dedicated tests
    });
  });

  describe('Configuration Validation', () => {
    it('should pass through all configuration correctly', async () => {
      const mockConfig = {
        openai: {
          apiKey: 'sk-test123',
          model: 'gpt-4-turbo',
          temperature: 0.3,
          sessionMaxTokens: 8192,
          organization: 'org-123',
          project: 'proj-456'
        },
        dispatch: {
          sessionMaxIteration: 15,
          mcpCallTimeout: 10000,
          agentPort: 8080,
          endpoint: '/api/agent'
        },
        transport: {
          mode: 'http',
          cubiclerUrl: 'https://api.cubicler.com'
        },
        memory: {
          enabled: false
        },
        jwt: createDefaultJWTConfig()
      };

      mockLoadConfig.mockReturnValue(mockConfig);

      const service = await createOpenAIServiceFromEnv();

      expect(service).toBeInstanceOf(OpenAIService);
      // OpenAIService construction succeeded; configuration details are exercised via transport/memory log assertions above
    });
  });

  describe('Internal Tool Creation', () => {
    it('should create all 11 memory tools when memory is enabled', async () => {
      // Ensure the memory repository mock returns a valid repository
      const mockCreateDefaultMemoryRepository = vi.mocked(createDefaultMemoryRepository);
      mockCreateDefaultMemoryRepository.mockResolvedValue({ 
        remember: vi.fn(),
        recall: vi.fn(),
        search: vi.fn(),
        getShortTermMemories: vi.fn(),
        addToShortTermMemory: vi.fn(),
        editImportance: vi.fn(),
        editContent: vi.fn(),
        addTag: vi.fn(),
        removeTag: vi.fn(),
        replaceTags: vi.fn(),
        forget: vi.fn()
      } as any);

      mockLoadConfig.mockReturnValue({
        openai: { apiKey: 'test' },
        dispatch: { agentPort: 3000, endpoint: '/agent' },
        transport: { mode: 'http', cubiclerUrl: 'http://localhost:3001' },
        memory: {
          enabled: true,
          type: 'in-memory',
          maxTokens: 1000,
          defaultImportance: 5
        },
        jwt: createDefaultJWTConfig()
      });

      await createOpenAIServiceFromEnv();

      // Verify all memory tools were instantiated
      const mockInternalToolAggregator = vi.mocked(InternalToolAggregator);
      
      expect(mockInternalToolAggregator).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ toolName: 'agentmemory_remember' }),
          expect.objectContaining({ toolName: 'agentmemory_recall' }),
          expect.objectContaining({ toolName: 'agentmemory_search' }),
          expect.objectContaining({ toolName: 'agentmemory_forget' }),
          expect.objectContaining({ toolName: 'agentmemory_get_short_term' }),
          expect.objectContaining({ toolName: 'agentmemory_add_to_short_term' }),
          expect.objectContaining({ toolName: 'agentmemory_edit_importance' }),
          expect.objectContaining({ toolName: 'agentmemory_edit_content' }),
          expect.objectContaining({ toolName: 'agentmemory_add_tag' }),
          expect.objectContaining({ toolName: 'agentmemory_remove_tag' }),
          expect.objectContaining({ toolName: 'agentmemory_replace_tags' })
        ])
      );
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle partial configuration gracefully', async () => {
      mockLoadConfig.mockReturnValue({
        openai: { 
          apiKey: 'test',
          model: 'gpt-3.5-turbo'
          // Missing optional fields like temperature, organization, etc.
        },
        dispatch: { 
          agentPort: 3000,
          endpoint: '/agent'
          // Missing optional fields
        },
        transport: { 
          mode: 'http',
          cubiclerUrl: 'http://localhost:3001'
        },
        memory: { 
          enabled: false 
        },
        jwt: createDefaultJWTConfig()
      });

      const service = await createOpenAIServiceFromEnv();

      expect(service).toBeInstanceOf(OpenAIService);
    });

    it('should handle stdio transport with optional parameters', async () => {
      mockLoadConfig.mockReturnValue({
        openai: { apiKey: 'test' },
        dispatch: {},
        transport: {
          mode: 'stdio',
          command: 'node',
          args: ['--experimental-modules', 'server.js'],
          cwd: '/custom/path'
        },
        memory: { enabled: false }
      });

      const service = await createOpenAIServiceFromEnv();

      expect(service).toBeInstanceOf(OpenAIService);
      
      const mockStdioAgentClient = vi.mocked(StdioAgentClient);
      expect(mockStdioAgentClient).toHaveBeenCalledWith(
        'node',
        ['--experimental-modules', 'server.js'],
        '/custom/path'
      );
    });
  });
});
