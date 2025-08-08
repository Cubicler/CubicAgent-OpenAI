import { type Config } from '../config/environment.js';
import { type CLIArgs } from './cli-args.js';

/**
 * Merge CLI arguments with environment configuration
 * CLI arguments take precedence over environment variables
 */
export function mergeConfigWithArgs(baseConfig: Config, args: CLIArgs): Config {
  return {
    openai: {
      ...baseConfig.openai,
      ...(args.apiKey && { apiKey: args.apiKey }),
      ...(args.model && { model: args.model as any }), // Type assertion for enum
      ...(args.temperature !== undefined && { temperature: args.temperature }),
      ...(args.maxTokens !== undefined && { sessionMaxTokens: args.maxTokens }),
      ...(args.baseUrl && { baseURL: args.baseUrl }),
      ...(args.openaiTimeout !== undefined && { timeout: args.openaiTimeout }),
      ...(args.openaiMaxRetries !== undefined && { maxRetries: args.openaiMaxRetries }),
      ...(args.summarizerModel && { summarizerModel: args.summarizerModel as any }), // Type assertion for enum
    },
    transport: {
      ...baseConfig.transport,
      // Only override transport mode if explicitly provided via CLI
      // Otherwise respect environment variables (important for Docker)
      ...(args.transport && { mode: args.transport }),
      ...(args.cubiclerUrl && { cubiclerUrl: args.cubiclerUrl }),
      ...(args.sseUrl && { sseUrl: args.sseUrl }),
      ...(args.agentId && { agentId: args.agentId }),
    },
    memory: {
      ...baseConfig.memory,
      // Enable memory if --memory-db-path is provided
      ...(args.memoryDbPath && { 
        enabled: true,
        type: 'sqlite',
        dbPath: args.memoryDbPath 
      }),
      ...(args.memoryMaxTokens !== undefined && { maxTokens: args.memoryMaxTokens }),
    },
    dispatch: {
      ...baseConfig.dispatch,
      ...(args.dispatchTimeout !== undefined && { timeout: args.dispatchTimeout }),
      ...(args.mcpMaxRetries !== undefined && { mcpMaxRetries: args.mcpMaxRetries }),
      ...(args.sessionMaxIteration !== undefined && { sessionMaxIteration: args.sessionMaxIteration }),
      ...(args.agentPort !== undefined && { agentPort: args.agentPort }),
    },
    jwt: {
      ...baseConfig.jwt,
      ...(args.jwt !== undefined && { enabled: args.jwt }),
      ...(args.jwtType && { type: args.jwtType }),
      ...(args.jwtToken && { token: args.jwtToken }),
    },
  };
}