import { z } from 'zod';
import 'dotenv/config';

/**
 * Environment Configuration Schema
 * Core: 8 required environment variables as specified in requirements
 * Optional: Additional OpenAI configuration for advanced use cases
 */

export const openAIConfigSchema = z.object({
  apiKey: z.string().min(1, 'OpenAI API key is required'),
  model: z.enum([
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4-turbo-preview',
    'gpt-4-0125-preview',
    'gpt-4-1106-preview',
    'gpt-4-vision-preview',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-0125',
    'gpt-3.5-turbo-1106',
    'gpt-3.5-turbo-16k'
  ]).default('gpt-4o'),
  temperature: z.number().min(0).max(2).default(0.7),
  sessionMaxTokens: z.number().positive().default(4096),
  organization: z.string().optional(),
  project: z.string().optional(),
  baseURL: z.string().url().optional(),
  timeout: z.number().positive().default(600000),
  maxRetries: z.number().min(0).default(2),
  summarizerModel: z.enum([
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4-turbo-preview',
    'gpt-4-0125-preview',
    'gpt-4-1106-preview',
    'gpt-4-vision-preview',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-0125',
    'gpt-3.5-turbo-1106',
    'gpt-3.5-turbo-16k'
  ]).optional(),
});

export const transportConfigSchema = z.object({
  mode: z.enum(['http', 'stdio', 'sse']).default('http'),
  cubiclerUrl: z.string().url().optional(),
  sseUrl: z.string().url().optional(),
  agentId: z.string().optional(),
});

export const memoryConfigSchema = z.object({
  enabled: z.boolean().default(false),
  type: z.enum(['memory', 'sqlite']).default('memory'),
  dbPath: z.string().default('./memories.db'),
  maxTokens: z.number().positive().default(2000),
  defaultImportance: z.number().min(0).max(1).default(0.5),
});

export const jwtConfigSchema = z.object({
  enabled: z.boolean().default(false),
  type: z.enum(['static', 'oauth']).default('static'),
  token: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  tokenEndpoint: z.string().url().optional(),
  scope: z.string().optional(),
  grantType: z.enum(['client_credentials', 'authorization_code']).default('client_credentials'),
  refreshToken: z.string().optional(),
  verificationSecret: z.string().optional(),
  verificationPublicKey: z.string().optional(),
  algorithms: z.array(z.string()).default(['HS256']),
  issuer: z.string().optional(),
  audience: z.string().optional(),
  ignoreExpiration: z.boolean().default(false),
});

export const dispatchConfigSchema = z.object({
  timeout: z.number().positive().default(30000),
  mcpMaxRetries: z.number().min(0).default(3),
  mcpCallTimeout: z.number().positive().default(10000),
  sessionMaxIteration: z.number().positive().default(10),
  endpoint: z.string().default('/'),
  agentPort: z.number().positive().default(3000),
});

export const configSchema = z.object({
  openai: openAIConfigSchema,
  transport: transportConfigSchema,
  memory: memoryConfigSchema,
  dispatch: dispatchConfigSchema,
  jwt: jwtConfigSchema,
});

/**
 * Load and validate environment configuration
 */
export function loadConfig() {
  const config = {
    openai: {
      apiKey: process.env['OPENAI_API_KEY'] || '',
      model: process.env['OPENAI_MODEL'] || 'gpt-4o',
      temperature: parseFloat(process.env['OPENAI_TEMPERATURE'] || '0.7'),
      sessionMaxTokens: parseInt(process.env['OPENAI_SESSION_MAX_TOKENS'] || '4096'),
      organization: process.env['OPENAI_ORG_ID'] || undefined,
      project: process.env['OPENAI_PROJECT_ID'] || undefined,
      baseURL: process.env['OPENAI_BASE_URL'] || undefined,
      timeout: parseInt(process.env['OPENAI_TIMEOUT'] || '600000'),
      maxRetries: parseInt(process.env['OPENAI_MAX_RETRIES'] || '2'),
      summarizerModel: process.env['OPENAI_SUMMARIZER_MODEL'] || undefined,
    },
    transport: {
      mode: (process.env['TRANSPORT_MODE'] as 'http' | 'stdio' | 'sse') || 'http',
      cubiclerUrl: process.env['CUBICLER_URL'] || undefined,
      sseUrl: process.env['SSE_URL'] || undefined,
      agentId: process.env['SSE_AGENT_ID'] || undefined,
    },
    memory: {
      enabled: process.env['MEMORY_ENABLED'] === 'true',
      type: (process.env['MEMORY_TYPE'] as 'memory' | 'sqlite') || 'memory',
      dbPath: process.env['MEMORY_DB_PATH'] || './memories.db',
      maxTokens: parseInt(process.env['MEMORY_MAX_TOKENS'] || '2000'),
      defaultImportance: parseFloat(process.env['MEMORY_DEFAULT_IMPORTANCE'] || '0.5'),
    },
    dispatch: {
      timeout: parseInt(process.env['DISPATCH_TIMEOUT'] || '30000'),
      mcpMaxRetries: parseInt(process.env['MCP_MAX_RETRIES'] || '3'),
      mcpCallTimeout: parseInt(process.env['MCP_CALL_TIMEOUT'] || '10000'),
      sessionMaxIteration: parseInt(process.env['DISPATCH_SESSION_MAX_ITERATION'] || '10'),
      endpoint: process.env['DISPATCH_ENDPOINT'] || '/',
      agentPort: parseInt(process.env['AGENT_PORT'] || '3000'),
    },
    jwt: {
      enabled: process.env['JWT_ENABLED'] === 'true',
      type: (process.env['JWT_TYPE'] as 'static' | 'oauth') || 'static',
      // Static JWT configuration
      token: process.env['JWT_TOKEN'] || undefined,
      // OAuth JWT configuration  
      clientId: process.env['JWT_CLIENT_ID'] || undefined,
      clientSecret: process.env['JWT_CLIENT_SECRET'] || undefined,
      tokenEndpoint: process.env['JWT_TOKEN_ENDPOINT'] || undefined,
      scope: process.env['JWT_SCOPE'] || undefined,
      grantType: (process.env['JWT_GRANT_TYPE'] as 'client_credentials' | 'authorization_code') || 'client_credentials',
      refreshToken: process.env['JWT_REFRESH_TOKEN'] || undefined,
      // JWT verification options (server-side)
      verificationSecret: process.env['JWT_VERIFICATION_SECRET'] || undefined,
      verificationPublicKey: process.env['JWT_VERIFICATION_PUBLIC_KEY'] || undefined,
      algorithms: process.env['JWT_ALGORITHMS']?.split(',').map(alg => alg.trim()) || ['HS256'],
      issuer: process.env['JWT_ISSUER'] || undefined,
      audience: process.env['JWT_AUDIENCE'] || undefined,
      ignoreExpiration: process.env['JWT_IGNORE_EXPIRATION'] === 'true',
    }
  };

  // Validate the configuration
  return configSchema.parse(config);
}

export type Config = z.infer<typeof configSchema>;
export type OpenAIConfig = z.infer<typeof openAIConfigSchema>;
export type TransportConfig = z.infer<typeof transportConfigSchema>;
export type MemoryConfig = z.infer<typeof memoryConfigSchema>;
export type DispatchConfig = z.infer<typeof dispatchConfigSchema>;
export type JWTConfig = z.infer<typeof jwtConfigSchema>;
