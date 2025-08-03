import { 
  CubicAgent, 
  AxiosAgentClient, 
  ExpressAgentServer, 
  StdioAgentClient, 
  StdioAgentServer,
  createDefaultMemoryRepository,
  createSQLiteMemoryRepository,
  type MemoryRepository
} from '@cubicler/cubicagentkit';
import { loadConfig, type TransportConfig, type DispatchConfig, type MemoryConfig } from '../config/environment.js';
import type { InternalToolHandling } from '../internal-tools/internal-tool-handler.interface.js';
import { InternalToolAggregator } from './internal-tool-aggregator.js';
import { OpenAIService } from './openai-service.js';

// Import all memory tools for default injection
import { MemoryRememberTool } from '../internal-tools/memory/memory-remember-tool.js';
import { MemoryRecallTool } from '../internal-tools/memory/memory-recall-tool.js';
import { MemorySearchTool } from '../internal-tools/memory/memory-search-tool.js';
import { MemoryForgetTool } from '../internal-tools/memory/memory-forget-tool.js';
import { MemoryGetShortTermTool } from '../internal-tools/memory/memory-get-short-term-tool.js';
import { MemoryAddToShortTermTool } from '../internal-tools/memory/memory-add-to-short-term-tool.js';
import { MemoryEditImportanceTool } from '../internal-tools/memory/memory-edit-importance-tool.js';
import { MemoryEditContentTool } from '../internal-tools/memory/memory-edit-content-tool.js';
import { MemoryAddTagTool } from '../internal-tools/memory/memory-add-tag-tool.js';
import { MemoryRemoveTagTool } from '../internal-tools/memory/memory-remove-tag-tool.js';
import { MemoryReplaceTagsTool } from '../internal-tools/memory/memory-replace-tags-tool.js';

/**
 * Factory function to create OpenAIService from environment variables
 */
export async function createOpenAIServiceFromEnv(): Promise<OpenAIService> {
  const { openai: openaiConfig, dispatch: dispatchConfig, transport: transportConfig, memory: memoryConfig } = loadConfig();

  // Initialize memory if configured
  const memory = await initializeMemory(memoryConfig);

  // Create internal tool aggregator with memory tools if memory is available
  const internalToolHandler = createInternalToolHandler(memory);

  // Initialize client and CubicAgent based on transport mode
  const cubicAgent = await createCubicAgent(transportConfig, dispatchConfig, memory);

  return new OpenAIService(cubicAgent, openaiConfig, dispatchConfig, internalToolHandler);
}

/**
 * Initialize memory repository if configured
 */
async function initializeMemory(memoryConfig: MemoryConfig): Promise<MemoryRepository | undefined> {
  if (!memoryConfig.enabled) {
    return undefined;
  }

  try {
    const memory = memoryConfig.type === 'sqlite' 
      ? await createSQLiteMemoryRepository(
          memoryConfig.dbPath,
          memoryConfig.maxTokens,
          memoryConfig.defaultImportance
        )
      : await createDefaultMemoryRepository(
          memoryConfig.maxTokens,
          memoryConfig.defaultImportance
        );
    
    console.log(`💾 Memory enabled: ${memoryConfig.type} (${memoryConfig.maxTokens} tokens)`);
    return memory;
  } catch (error) {
    console.warn(`⚠️ Memory initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return undefined;
  }
}

/**
 * Create internal tool handler with memory tools if memory is available
 */
function createInternalToolHandler(memory: MemoryRepository | undefined): InternalToolHandling | undefined {
  if (!memory) {
    return undefined;
  }

  const memoryTools = [
    new MemoryRememberTool(memory),
    new MemoryRecallTool(memory),
    new MemorySearchTool(memory),
    new MemoryForgetTool(memory),
    new MemoryGetShortTermTool(memory),
    new MemoryAddToShortTermTool(memory),
    new MemoryEditImportanceTool(memory),
    new MemoryEditContentTool(memory),
    new MemoryAddTagTool(memory),
    new MemoryRemoveTagTool(memory),
    new MemoryReplaceTagsTool(memory)
  ];
  
  const handler = new InternalToolAggregator(memoryTools);
  console.log(`🔧 Internal tools enabled: ${memoryTools.length} memory tools`);
  return handler;
}

/**
 * Create CubicAgent with appropriate client and server based on transport mode
 */
async function createCubicAgent(
  transportConfig: TransportConfig, 
  dispatchConfig: DispatchConfig, 
  memory: MemoryRepository | undefined
): Promise<CubicAgent> {
  if (transportConfig.mode === 'stdio') {
    return createStdioCubicAgent(transportConfig, memory);
  } else {
    return createHttpCubicAgent(transportConfig, dispatchConfig, memory);
  }
}

/**
 * Create CubicAgent for stdio transport mode
 */
function createStdioCubicAgent(
  transportConfig: TransportConfig,
  memory: MemoryRepository | undefined
): CubicAgent {
  if (!transportConfig.command) {
    throw new Error('STDIO_COMMAND is required for stdio transport mode');
  }

  const client = new StdioAgentClient(
    transportConfig.command,
    transportConfig.args,
    transportConfig.cwd
  );
  const server = new StdioAgentServer();
  const cubicAgent = new CubicAgent(client, server, memory);
  
  console.log(`🚀 OpenAI ready - ${transportConfig.mode} transport - stdio`);
  
  return cubicAgent;
}

/**
 * Create CubicAgent for HTTP transport mode
 */
function createHttpCubicAgent(
  transportConfig: TransportConfig,
  dispatchConfig: DispatchConfig,
  memory: MemoryRepository | undefined
): CubicAgent {
  if (!transportConfig.cubiclerUrl) {
    throw new Error('CUBICLER_URL is required for HTTP transport mode');
  }

  const client = new AxiosAgentClient(transportConfig.cubiclerUrl, dispatchConfig.mcpCallTimeout);
  const server = new ExpressAgentServer(dispatchConfig.agentPort, dispatchConfig.endpoint);
  const cubicAgent = new CubicAgent(client, server, memory);
  
  console.log(`🚀 OpenAI ready - ${transportConfig.mode} transport - ${dispatchConfig.agentPort}`);
  
  return cubicAgent;
}
