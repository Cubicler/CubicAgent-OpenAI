import { 
  CubicAgent, 
  HttpAgentClient, 
  HttpAgentServer, 
  StdioAgentClient, 
  StdioAgentServer,
  SSEAgentServer,
  createDefaultMemoryRepository,
  createSQLiteMemoryRepository,
  type MemoryRepository,
  type JWTAuthConfig,
  type JWTMiddlewareConfig
} from '@cubicler/cubicagentkit';
import { loadConfig, type TransportConfig, type DispatchConfig, type MemoryConfig, type JWTConfig } from '../config/environment.js';
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
  const { openai: openaiConfig, dispatch: dispatchConfig, transport: transportConfig, memory: memoryConfig, jwt: jwtConfig } = loadConfig();

  // Initialize memory if configured
  const memory = await initializeMemory(memoryConfig);

  // Create internal tool aggregator with memory tools if memory is available
  const internalToolHandler = createInternalToolHandler(memory);

  // Initialize client and CubicAgent based on transport mode
  const cubicAgent = await createCubicAgent(transportConfig, dispatchConfig, jwtConfig, memory);

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
  jwtConfig: JWTConfig,
  memory: MemoryRepository | undefined
): Promise<CubicAgent> {
  if (transportConfig.mode === 'stdio') {
    return createStdioCubicAgent(transportConfig, memory);
  } else if (transportConfig.mode === 'sse') {
    return createSSECubicAgent(transportConfig, jwtConfig, memory);
  } else {
    return createHttpCubicAgent(transportConfig, dispatchConfig, jwtConfig, memory);
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
  jwtConfig: JWTConfig,
  memory: MemoryRepository | undefined
): CubicAgent {
  if (!transportConfig.cubiclerUrl) {
    throw new Error('CUBICLER_URL is required for HTTP transport mode');
  }

  // Create client with optional JWT authentication
  const client = new HttpAgentClient(transportConfig.cubiclerUrl, dispatchConfig.mcpCallTimeout);
  
  // Configure JWT auth for client if enabled
  if (jwtConfig.enabled) {
    const authConfig = createJWTAuthConfig(jwtConfig);
    if (authConfig) {
      client.useJWTAuth(authConfig);
      console.log(`🔐 JWT auth enabled for client: ${jwtConfig.type}`);
    }
  }

  // Create server with optional JWT middleware
  const server = new HttpAgentServer(dispatchConfig.agentPort, dispatchConfig.endpoint);
  
  // Configure JWT middleware for server if enabled
  if (jwtConfig.enabled && (jwtConfig.verificationSecret || jwtConfig.verificationPublicKey)) {
    const middlewareConfig = createJWTMiddlewareConfig(jwtConfig);
    if (middlewareConfig) {
      server.useJWTAuth(middlewareConfig);
      console.log(`🔐 JWT middleware enabled for server`);
    }
  }

  const cubicAgent = new CubicAgent(client, server, memory);
  
  console.log(`🚀 OpenAI ready - ${transportConfig.mode} transport - ${dispatchConfig.agentPort}`);
  
  return cubicAgent;
}

/**
 * Create CubicAgent for SSE transport mode
 */
function createSSECubicAgent(
  transportConfig: TransportConfig,
  jwtConfig: JWTConfig,
  memory: MemoryRepository | undefined
): CubicAgent {
  if (!transportConfig.sseUrl) {
    throw new Error('SSE_URL is required for SSE transport mode');
  }
  
  if (!transportConfig.agentId) {
    throw new Error('SSE_AGENT_ID is required for SSE transport mode');
  }

  // Create client with optional JWT authentication
  const client = new HttpAgentClient(transportConfig.sseUrl);
  
  // Configure JWT auth for client if enabled
  if (jwtConfig.enabled) {
    const authConfig = createJWTAuthConfig(jwtConfig);
    if (authConfig) {
      client.useJWTAuth(authConfig);
      console.log(`🔐 JWT auth enabled for SSE client: ${jwtConfig.type}`);
    }
  }

  // Create SSE server
  const server = new SSEAgentServer(transportConfig.sseUrl, transportConfig.agentId);
  
  const cubicAgent = new CubicAgent(client, server, memory);
  
  console.log(`⚡ OpenAI ready - ${transportConfig.mode} transport - SSE connected to ${transportConfig.sseUrl}`);
  
  return cubicAgent;
}

/**
 * Create JWT auth configuration for the client from environment settings
 */
function createJWTAuthConfig(jwtConfig: JWTConfig): JWTAuthConfig | null {
  if (!jwtConfig.enabled) {
    return null;
  }

  if (jwtConfig.type === 'static') {
    if (!jwtConfig.token) {
      console.warn('⚠️ JWT_TOKEN is required for static JWT authentication');
      return null;
    }
    return {
      type: 'static',
      token: jwtConfig.token
    };
  } else {
    if (!jwtConfig.clientId || !jwtConfig.clientSecret || !jwtConfig.tokenEndpoint) {
      console.warn('⚠️ JWT_CLIENT_ID, JWT_CLIENT_SECRET, and JWT_TOKEN_ENDPOINT are required for OAuth JWT authentication');
      return null;
    }
    
    const oauthConfig: any = { // eslint-disable-line @typescript-eslint/no-explicit-any -- Need to build config dynamically
      type: 'oauth',
      clientId: jwtConfig.clientId,
      clientSecret: jwtConfig.clientSecret,
      tokenEndpoint: jwtConfig.tokenEndpoint,
      grantType: jwtConfig.grantType
    };

    // Only add optional properties if they're defined
    if (jwtConfig.scope) {
      oauthConfig.scope = jwtConfig.scope;
    }
    if (jwtConfig.refreshToken) {
      oauthConfig.refreshToken = jwtConfig.refreshToken;
    }

    return oauthConfig;
  }
}

/**
 * Create JWT middleware configuration for the server from environment settings
 */
function createJWTMiddlewareConfig(jwtConfig: JWTConfig): JWTMiddlewareConfig | null {
  if (!jwtConfig.enabled) {
    return null;
  }

  const verification: any = { // eslint-disable-line @typescript-eslint/no-explicit-any -- Need to build config dynamically
    algorithms: jwtConfig.algorithms,
    ignoreExpiration: jwtConfig.ignoreExpiration
  };

  // Only add optional properties if they're defined
  if (jwtConfig.verificationSecret) {
    verification.secret = jwtConfig.verificationSecret;
  }
  if (jwtConfig.verificationPublicKey) {
    verification.publicKey = jwtConfig.verificationPublicKey;
  }
  if (jwtConfig.issuer) {
    verification.issuer = jwtConfig.issuer;
  }
  if (jwtConfig.audience) {
    verification.audience = jwtConfig.audience;
  }

  return {
    verification
  };
}
