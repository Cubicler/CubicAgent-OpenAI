#!/usr/bin/env node

import { createOpenAIServiceFromEnv } from './core/openai-service-factory.js';

/**
 * Main entry point for CubicAgent-OpenAI
 * Loads configuration and starts the OpenAI service
 */
async function main() {
  try {
    console.log('Loading configuration and initializing OpenAI service...');

    // Create the OpenAI service from environment variables
    const openaiService = await createOpenAIServiceFromEnv();

    // Start the service
    await openaiService.start();
    
    console.log('CubicAgent-OpenAI started successfully');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...');
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

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Export for library usage
export { 
  createOpenAIServiceFromEnv,
  createOpenAIServiceFromConfig,
  createOpenAIServiceWithMemory,
  createOpenAIServiceBasic
} from './core/openai-service-factory.js';
export { OpenAIService } from './core/openai-service.js';
