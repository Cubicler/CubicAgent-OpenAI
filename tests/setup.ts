// Test setup configuration
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set up test environment variables if not provided
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-api-key';
process.env.AGENT_NAME = process.env.AGENT_NAME || 'TestAgent';
process.env.OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4';
process.env.AGENT_TEMPERATURE = process.env.AGENT_TEMPERATURE || '0.5';
process.env.MAX_TOKENS = process.env.MAX_TOKENS || '1000';
process.env.CUBICLER_URL = process.env.CUBICLER_URL || 'http://localhost:1503';
process.env.AGENT_PORT = process.env.AGENT_PORT || '3001';
process.env.AGENT_TIMEOUT = process.env.AGENT_TIMEOUT || '5000';
process.env.AGENT_MAX_RETRIES = process.env.AGENT_MAX_RETRIES || '2';
