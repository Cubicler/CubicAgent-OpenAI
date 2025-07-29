import { z } from 'zod';
import 'dotenv/config';

/**
    dispatch: {
      timeout: parseInt(process.env['DISPATCH_TIMEOUT'] || '30000'),
      mcpMaxRetries: parseInt(process.env['MCP_MAX_RETRIES'] || '3'),
      mcpCallTimeout: parseInt(process.env['MCP_CALL_TIMEOUT'] || '10000'),
      sessionMaxIteration: parseInt(process.env['DISPATCH_SESSION_MAX_ITERATION'] || '10'),
      endpoint: process.env['DISPATCH_ENDPOINT'] || '/',
      agentPort: parseInt(process.env['AGENT_PORT'] || '3000'),
    },ronment Configuration Schema
 * Core: 8 required environment variables as specified in requirements
 * Optional: Additional OpenAI configuration for advanced use cases
 */

// OpenAI Configuration Schema
export const openAIConfigSchema = z.object({
  apiKey: z.string().min(1, 'OpenAI API key is required'),
  model: z.enum(['gpt-4o', 'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']).default('gpt-4o'),
  temperature: z.number().min(0).max(2).default(0.7),
  sessionMaxTokens: z.number().positive().default(4096),
  organization: z.string().optional(),
  project: z.string().optional(),
  baseURL: z.string().url().optional(),
  timeout: z.number().positive().default(600000), // 10 minutes (OpenAI default)
  maxRetries: z.number().min(0).default(2), // OpenAI default
});

// Dispatch Configuration Schema  
export const dispatchConfigSchema = z.object({
  timeout: z.number().positive().default(30000), // 30 seconds - overall request timeout
  mcpMaxRetries: z.number().min(0).default(3),
  mcpCallTimeout: z.number().positive().default(10000), // 10 seconds - individual MCP call timeout
  sessionMaxIteration: z.number().positive().default(10),
  endpoint: z.string().default('/'), // Default endpoint path
  agentPort: z.number().positive().default(3000), // Agent server port
});

// Combined Configuration Schema
export const configSchema = z.object({
  openai: openAIConfigSchema,
  dispatch: dispatchConfigSchema,
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
      timeout: parseInt(process.env['OPENAI_TIMEOUT'] || '600000'), // 10 minutes
      maxRetries: parseInt(process.env['OPENAI_MAX_RETRIES'] || '2'),
    },  
    dispatch: {
      timeout: parseInt(process.env['DISPATCH_TIMEOUT'] || '30000'),
      mcpMaxRetries: parseInt(process.env['MCP_MAX_RETRIES'] || '3'),
      mcpCallTimeout: parseInt(process.env['MCP_CALL_TIMEOUT'] || '10000'),
      sessionMaxIteration: parseInt(process.env['DISPATCH_SESSION_MAX_ITERATION'] || '10'),
      endpoint: process.env['DISPATCH_ENDPOINT'] || '/',
      agentPort: parseInt(process.env['AGENT_PORT'] || '3000'),
    }
  };

  // Validate the configuration
  return configSchema.parse(config);
}

export type Config = z.infer<typeof configSchema>;
export type OpenAIConfig = z.infer<typeof openAIConfigSchema>;
export type DispatchConfig = z.infer<typeof dispatchConfigSchema>;
