#!/usr/bin/env node

import { loadConfig } from './config/environment.js';
import { OpenAIService } from './core/openai-service.js';

/**
 * Main entry point for CubicAgent-OpenAI
 * Loads configuration and starts the OpenAI service
 */
async function main() {
  try {
    // Load and validate configuration
    console.log('Loading configuration...');
    const config = loadConfig();
    
    console.log('Configuration loaded successfully:', {
      model: config.openai.model,
      temperature: config.openai.temperature,
      maxTokens: config.openai.sessionMaxTokens,
      maxIterations: config.dispatch.sessionMaxIteration,
      agentPort: config.dispatch.agentPort
    });

    // Get Cubicler URL from environment
    const cubiclerUrl = process.env['CUBICLER_URL'];
    if (!cubiclerUrl) {
      throw new Error('CUBICLER_URL environment variable is required');
    }

    console.log('Initializing OpenAI service...', { cubiclerUrl });

    // Create and start the OpenAI service
    const openaiService = new OpenAIService(
      config.openai,
      config.dispatch,
      cubiclerUrl
    );

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
