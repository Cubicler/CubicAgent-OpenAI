import dotenv from 'dotenv';
import { OpenAICubicAgent, type OpenAIAgentConfig } from './openai-cubicagent.js';
import { createConfigFromEnv } from './utils/env-helper.js';

dotenv.config();

/**
 * Main function to start the agent service
 */
export async function startAgent(): Promise<OpenAICubicAgent> {
  try {
    console.log('🔧 Initializing OpenAI Cubic Agent...');
    
    const config = createConfigFromEnv();
    const agent = new OpenAICubicAgent(config);
    agent.start();
    
    return agent;

  } catch (error) {
    console.error('❌ Failed to start agent:', error);
    process.exit(1);
  }
}

// Export the agent class for testing and external use
export { OpenAICubicAgent, type OpenAIAgentConfig } from './openai-cubicagent.js';

// Start the agent if this file is run directly
// This check works in Node.js ES modules
const isMainModule = process.argv[1] && process.argv[1].endsWith('index.js');
if (isMainModule) {
  startAgent();
}
