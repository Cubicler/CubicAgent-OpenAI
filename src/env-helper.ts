import { type OpenAIAgentConfig } from './openai-cubicagent.js';

/**
 * Creates configuration from environment variables
 */
export function createConfigFromEnv(): OpenAIAgentConfig {
  // Validate required environment variables
  const requiredEnvVars = ['OPENAI_API_KEY'];
  const missing = requiredEnvVars.filter(key => !process.env[key] || process.env[key]!.trim() === '');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    agentPort: Number(process.env.AGENT_PORT) || 3000,
    agentName: process.env.AGENT_NAME || 'CubicAgent-OpenAI',
    openaiApiKey: process.env.OPENAI_API_KEY!,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
    agentTemperature: parseFloat(process.env.OPENAI_TEMPERATURE || '1'),
    maxTokens: parseInt(process.env.OPENAI_SESSION_MAX_TOKENS || '2048'),
    cubiclerUrl: process.env.CUBICLER_URL || 'http://localhost:1503',
    agentTimeout: parseInt(process.env.AGENT_TIMEOUT || '10000'),
    agentMaxRetries: parseInt(process.env.AGENT_MAX_RETRIES || '3'),
    maxFunctionIterations: parseInt(process.env.AGENT_SESSION_MAX_ITERATION || '10'),
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info'
  };
}
