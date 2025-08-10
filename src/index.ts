#!/usr/bin/env node

import { createOpenAIServiceFromEnv } from './core/openai-service-factory.js';
import { parseArgs, printHelp, printVersion } from './utils/cli-args.js';

/**
 * Main entry point for CubicAgent-OpenAI
 * Loads configuration and starts the OpenAI service
 */
async function main() {
  try {
    const cliArgs = parseArgs();

    if (cliArgs.help) {
      printHelp();
      return;
    }

    if (cliArgs.version) {
      printVersion();
      return;
    }

    // If no transport specified via CLI or env vars, default to stdio for CLI usage
    const hasAnyArgs = Object.keys(cliArgs).length > 0;
    const finalCliArgs = hasAnyArgs && !cliArgs.transport && !process.env['TRANSPORT_MODE'] 
      ? { ...cliArgs, transport: 'stdio' as const }
      : cliArgs;

    const isStdio = (finalCliArgs.transport === 'stdio') || process.env['TRANSPORT_MODE'] === 'stdio';
    if (!isStdio) {
      console.log('Loading configuration and initializing OpenAI service...');
    }
    
    const openaiService = await createOpenAIServiceFromEnv(finalCliArgs);

    await openaiService.start();
    
    if (!isStdio) {
      console.log('CubicAgent-OpenAI started successfully');
    }
    
    process.on('SIGINT', async () => {
      if (!isStdio) console.log('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      if (!isStdio) console.log('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start CubicAgent-OpenAI:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('cubicagent-openai');
if (isMainModule) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
export { 
  createOpenAIServiceFromEnv,
  createOpenAIServiceFromConfig,
  createOpenAIServiceWithMemory,
  createOpenAIServiceBasic
} from './core/openai-service-factory.js';
export { OpenAIService } from './core/openai-service.js';
