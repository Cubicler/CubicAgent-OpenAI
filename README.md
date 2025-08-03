# CubicAgent-OpenAI 🤖

A **ready-to-deploy OpenAI agent application and npm library** that integrates OpenAI's language models (GPT-4, GPT-4o, GPT-3.5-turbo) with [Cubicler 2.3](https://github.com/hainayanda/Cubicler) using [`@cubicler/cubicagentkit@^2.3.1`](https://www.npmjs.com/package/@cubicler/cubicagentkit) as the foundation library.

## 🎯 Overview

CubicAgent-OpenAI is both a **deployable agent application** and a **reusable npm library** that:

- ✅ **NPM Package** - Available as `@cubicler/cubicagent-openai` with CLI and library exports
- ✅ **Multiple transport modes** - HTTP and stdio communication support
- ✅ **CubicAgent injection** - Can be used as internal agent within Cubicler
- ✅ **Memory integration** - Optional sentence-based memory with SQLite or in-memory storage
- ✅ **Lazy initialization** - Only connects to Cubicler on first dispatch request
- ✅ **Multi-turn conversations** - Handles iterative function calling with session limits
- ✅ **OpenAI integration** - Supports GPT-4o, GPT-4, GPT-4-turbo, GPT-3.5-turbo
- ✅ **MCP tool mapping** - Converts Cubicler tools to OpenAI function calling format
- ✅ **Retry logic** - Robust MCP communication with exponential backoff
- ✅ **TypeScript support** - Full type definitions and modern ES modules
- ✅ **Zero-code deployment** - Just configure `.env` and run

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key
- Running Cubicler 2.3 instance (connects automatically on first request)

### Installation

#### Option 1: npm Package (Recommended)

```bash
# Install as a dependency in your project
npm install @cubicler/cubicagent-openai

# Or install globally for CLI usage
npm install -g @cubicler/cubicagent-openai
```

#### Option 2: Clone and Build

```bash
# Clone the repository
git clone https://github.com/Cubicler/CubicAgent-OpenAI.git
cd CubicAgent-OpenAI

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Configuration

Create a `.env` file with the following variables:

```env
# Required Configuration
OPENAI_API_KEY=your-openai-api-key-here

# OpenAI Configuration (with defaults)
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7
OPENAI_SESSION_MAX_TOKENS=4096

# Optional OpenAI Configuration
# OPENAI_ORG_ID=org-your-organization-id
# OPENAI_PROJECT_ID=proj_your-project-id  
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_TIMEOUT=600000
# OPENAI_MAX_RETRIES=2

# Transport Configuration
TRANSPORT_MODE=http
# For HTTP transport (default):
CUBICLER_URL=http://localhost:8080
# For stdio transport:
# STDIO_COMMAND=npx
# STDIO_ARGS=cubicler,--server
# STDIO_CWD=/path/to/cubicler

# Memory Configuration (optional)
MEMORY_ENABLED=false
MEMORY_TYPE=memory
MEMORY_DB_PATH=./memories.db
MEMORY_MAX_TOKENS=2000
MEMORY_DEFAULT_IMPORTANCE=0.5

# Dispatch Configuration (with defaults)
DISPATCH_TIMEOUT=30000
MCP_MAX_RETRIES=3
MCP_CALL_TIMEOUT=10000
DISPATCH_SESSION_MAX_ITERATION=10
DISPATCH_ENDPOINT=/
AGENT_PORT=3000
```

### Running the Service

#### Using npm Package

```bash
# Run directly with npx (recommended)
npx @cubicler/cubicagent-openai

# Or if installed globally
cubicagent-openai

# With environment file
npx @cubicler/cubicagent-openai --env-file .env
```

#### Using Source Code

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The service will be available at `http://localhost:3000` with:

- **Lazy initialization** - Server starts immediately, connects to Cubicler on first request
- **Agent endpoint** - Default `/` (configurable via `DISPATCH_ENDPOINT`)
- **Health checks** - Built into CubicAgentKit for monitoring

## 🏗️ Usage Patterns

### As a Standalone Application

```bash
# Using npm global installation
npx @cubicler/cubicagent-openai

# Or using local clone
npm run dev
```

### As a Library in Your Project

#### Basic Library Usage

```typescript
import { OpenAIService } from '@cubicler/cubicagent-openai';
import { createOpenAIConfig, createDispatchConfig } from '@cubicler/cubicagent-openai/config';

// Create configuration
const openaiConfig = createOpenAIConfig({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  temperature: 0.7,
  sessionMaxTokens: 4096
});

const dispatchConfig = createDispatchConfig({
  timeout: 30000,
  mcpMaxRetries: 3,
  sessionMaxIteration: 10
});

// Initialize service
const service = new OpenAIService(openaiConfig, dispatchConfig);

// Process a request
const response = await service.processRequest(agentRequest, cubicAgent);
```

#### HTTP Transport Mode

```typescript
import { OpenAIService } from '@cubicler/cubicagent-openai';

const service = new OpenAIService(
  openaiConfig,
  dispatchConfig, 
  { mode: 'http', cubiclerUrl: 'http://localhost:8080' },
  { enabled: true, type: 'sqlite', dbPath: './agent-memory.db' }
);
await service.start();
```

#### Injected Agent (Internal to Cubicler)

```typescript
import { OpenAIService } from '@cubicler/cubicagent-openai';

// Use existing CubicAgent instance
const service = new OpenAIService(existingCubicAgent, openaiConfig, dispatchConfig);
const response = await service.processRequest(request, client);
```

#### Stdio Transport

```typescript
const service = new OpenAIService(
  openaiConfig,
  dispatchConfig,
  { mode: 'stdio', command: 'npx', args: ['cubicler', '--server'] }
);
await service.start();
```

## � NPM Package Features

### Installation Options

```bash
# Install as project dependency
npm install @cubicler/cubicagent-openai

# Install globally for CLI usage
npm install -g @cubicler/cubicagent-openai

# Use without installation
npx @cubicler/cubicagent-openai
```

### Library Exports

The npm package provides clean exports for integration:

```typescript
// Main service class
import { OpenAIService } from '@cubicler/cubicagent-openai';

// Configuration helpers
import { 
  createOpenAIConfig, 
  createDispatchConfig,
  validateEnvironment 
} from '@cubicler/cubicagent-openai/config';

// Type definitions
import { 
  OpenAIConfig, 
  DispatchConfig, 
  TransportConfig 
} from '@cubicler/cubicagent-openai/types';

// Utility functions
import { 
  buildSystemMessage, 
  convertToOpenAIMessages 
} from '@cubicler/cubicagent-openai/utils';
```

### CLI Usage

When installed globally or used with npx:

```bash
# Start with default configuration
cubicagent-openai

# Start with custom environment file
cubicagent-openai --env-file /path/to/.env

# Start with specific port
cubicagent-openai --port 8080

# Show help
cubicagent-openai --help

# Show version
cubicagent-openai --version
```

## �🐳 Docker Deployment

### Quick Docker Run

```bash
# Build and run locally
docker build -t cubicagent-openai .
docker run -p 3000:3000 --env-file .env cubicagent-openai
```

### Docker Compose

The project includes a `docker-compose.yml` file for easy deployment:

```bash
# Using environment file
docker-compose --env-file .env up --build

# Or with inline environment variables
OPENAI_API_KEY=your-api-key CUBICLER_URL=http://localhost:8080 docker-compose up --build
```

Example `docker-compose.yml`:

```yaml
services:
  cubicagent-openai:
    build: .
    ports:
      - "${AGENT_PORT:-3000}:${AGENT_PORT:-3000}"
    environment:
      # Required
      - CUBICLER_URL=${CUBICLER_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      
      # OpenAI Configuration
      - OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o}
      - OPENAI_TEMPERATURE=${OPENAI_TEMPERATURE:-0.7}
      - OPENAI_SESSION_MAX_TOKENS=${OPENAI_SESSION_MAX_TOKENS:-4096}
      
      # Dispatch Configuration
      - AGENT_PORT=${AGENT_PORT:-3000}
      - DISPATCH_TIMEOUT=${DISPATCH_TIMEOUT:-30000}
      - MCP_MAX_RETRIES=${MCP_MAX_RETRIES:-3}
      - MCP_CALL_TIMEOUT=${MCP_CALL_TIMEOUT:-10000}
      - DISPATCH_SESSION_MAX_ITERATION=${DISPATCH_SESSION_MAX_ITERATION:-10}
      - DISPATCH_ENDPOINT=${DISPATCH_ENDPOINT:-/}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${AGENT_PORT:-3000}/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    networks:
      - cubicagent-network

networks:
  cubicagent-network:
    driver: bridge
```

## 🔧 API Reference

### Session Flow

1. **Lazy Connection** - Agent starts without connecting to Cubicler
2. **First Request** - CubicAgentKit automatically initializes connection
3. **Tool Discovery** - Agent fetches available tools via MCP
4. **Iterative Execution** - OpenAI calls tools, agent executes, continues conversation
5. **Session Limits** - Respects `DISPATCH_SESSION_MAX_ITERATION` and token limits

### Request Format (handled by CubicAgentKit)

```typescript
interface AgentRequest {
  messages: Message[];      // Conversation history
  // Additional CubicAgentKit fields handled automatically
}

interface Message {
  role: string;            // Message sender role
  content: string;         // Message content
}
```

### Response Format

The agent returns the final OpenAI response after processing any tool calls within the session iteration limit.

## 🧪 Testing

The project uses **Vitest** as the testing framework with comprehensive test coverage.

### Unit Tests (Default)

Run fast unit tests that mock external dependencies:

```bash
# Run unit tests (default - fast, no API key required)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Features:**

- ✅ **Fast execution** - No external API calls
- ✅ **No OpenAI API key required** - Uses mocks and fixtures
- ✅ **Comprehensive coverage** - Tests all core functionality
- ✅ **Configuration validation** - Environment variable edge cases

### Integration Tests (Separate)

Run integration tests with real OpenAI API calls:

```bash
# Run integration tests (requires valid OpenAI API key)
npm run test:integration
```

**Features:**

- ✅ **Real OpenAI API testing** - Validates actual ChatGPT responses
- ✅ **Function calling validation** - Tests tool execution flow
- ✅ **Session iteration testing** - Multi-turn conversation scenarios
- ⚠️ **Requires `OPENAI_API_KEY`** in environment

## 📁 Project Structure

### Source Code Structure

```text
src/
├── index.ts                         # Application entry point with CLI and library exports
├── config/
│   ├── environment.ts               # Environment variable validation with Zod
│   └── types.ts                     # Configuration type definitions
├── core/
│   ├── agent-memory-handler.ts      # Memory integration with MCP tool handling
│   └── openai-service.ts            # OpenAI API integration with iterative function calling
├── models/
│   └── types.ts                     # Core type definitions and interfaces
└── utils/
    └── message-helper.ts            # Message format conversion utilities
tests/
├── setup.ts                         # Test configuration and setup
├── integration/
│   └── openai-service.integration.test.ts # Integration tests with OpenAI API
└── unit/
    ├── config/
    │   └── environment.test.ts      # Configuration validation tests
    ├── core/
    │   ├── agent-memory-handler.test.ts # Memory handler unit tests
    │   └── openai-service.test.ts   # Unit tests for OpenAI service
    └── utils/
        └── message-helper.test.ts   # Message helper unit tests
```

### NPM Package Structure

```text
dist/                                # Compiled JavaScript output
├── index.js                         # Main entry point and CLI binary
├── config/                          # Configuration exports
├── core/                            # Core service classes
├── models/                          # Type definitions
└── utils/                           # Utility functions

package.json                         # NPM package metadata with binary entry
├── "main": "dist/index.js"         # Library entry point
├── "bin": { "cubicagent-openai": "dist/index.js" } # CLI binary
├── "type": "module"                 # ES modules support
└── "exports": { ... }               # Clean import paths

README.md                            # This documentation
LICENSE                              # Apache 2.0 license
.env.example                         # Example environment configuration
Dockerfile                           # Docker build configuration
docker-compose.yml                   # Docker compose for local development
vitest.config.ts                     # Vitest test configuration
eslint.config.js                     # ESLint configuration
tsconfig.json                        # TypeScript configuration
```

## 🛠️ Development

### Key Components

- **OpenAIService**: Main service class handling OpenAI API integration and iterative function calling
- **CubicAgent**: Core orchestrator from CubicAgentKit 2.3.1 with lazy initialization
- **Message Helper**: Utilities for converting between Cubicler and OpenAI message formats
- **Environment Configuration**: Zod-based validation for all 11 environment variables
- **Lazy Initialization**: Automatic connection to Cubicler on first dispatch request

### Architecture Benefits

- **Fast Startup**: Application starts immediately without waiting for Cubicler connection
- **Fault Tolerance**: Can start even if Cubicler is temporarily unavailable
- **Resource Efficiency**: Only establishes connection when needed
- **Automatic Retry**: Built-in exponential backoff for MCP communication failures
- **Session Management**: Handles multi-turn conversations with iteration limits

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CUBICLER_URL` | **Yes** | - | Cubicler instance URL for MCP communication |
| `OPENAI_API_KEY` | **Yes** | - | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model: gpt-4o, gpt-4, gpt-4-turbo, gpt-3.5-turbo |
| `OPENAI_TEMPERATURE` | No | `0.7` | Response creativity (0.0-2.0) |
| `OPENAI_SESSION_MAX_TOKENS` | No | `4096` | Maximum tokens per session/response |
| `OPENAI_ORG_ID` | No | - | OpenAI organization ID (optional) |
| `OPENAI_PROJECT_ID` | No | - | OpenAI project ID (optional) |
| `OPENAI_BASE_URL` | No | - | Custom API base URL (optional) |
| `OPENAI_TIMEOUT` | No | `600000` | API timeout in milliseconds |
| `OPENAI_MAX_RETRIES` | No | `2` | Max retry attempts for OpenAI API |
| `DISPATCH_TIMEOUT` | No | `30000` | Overall request timeout (ms) |
| `MCP_MAX_RETRIES` | No | `3` | Max retry attempts for MCP communication |
| `MCP_CALL_TIMEOUT` | No | `10000` | Individual MCP call timeout (ms) |
| `DISPATCH_SESSION_MAX_ITERATION` | No | `10` | Max iterations per conversation session |
| `DISPATCH_ENDPOINT` | No | `/` | Agent endpoint path |
| `AGENT_PORT` | No | `3000` | HTTP server port |

### Error Handling

The service handles common error scenarios:

- ❌ **Missing required environment variables** - `CUBICLER_URL` or `OPENAI_API_KEY`
- ❌ **OpenAI API failures** - Rate limits, network issues, context length exceeded
- ❌ **MCP communication errors** - Connection failures, timeout, retry exhaustion
- ❌ **Session limits** - Iteration limits, token limits, timeout exceeded
- ❌ **Configuration errors** - Invalid environment variable values

All errors are handled gracefully with structured logging and appropriate HTTP status codes.

## 🤝 Integration with Cubicler

This agent integrates with Cubicler 2.3 using the lazy initialization pattern:

1. **Application Startup**: Agent starts HTTP server immediately without connecting to Cubicler
2. **Lazy Connection**: CubicAgentKit 2.3.1 automatically connects on first dispatch request
3. **Tool Discovery**: Agent fetches available MCP tools from Cubicler
4. **Function Calling**: OpenAI can call tools, agent executes via MCP, continues conversation
5. **Session Management**: Handles multi-turn conversations with iteration and token limits
6. **Retry Logic**: Automatic retry for MCP communication failures with exponential backoff

## 📝 License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [Cubicler](https://github.com/hainayanda/Cubicler) - AI Orchestration Framework 2.3
- [@cubicler/cubicagentkit](https://www.npmjs.com/package/@cubicler/cubicagentkit) - Agent SDK 2.3.1
- [@cubicler/cubicagent-openai](https://www.npmjs.com/package/@cubicler/cubicagent-openai) - This package on npm

## 🐛 Troubleshooting

### Common Issues

**Agent won't start:**

- Check that `OPENAI_API_KEY` is set correctly
- Verify `CUBICLER_URL` points to a valid Cubicler 2.3 instance
- Ensure port 3000 (or configured `AGENT_PORT`) is available
- Verify Node.js version is 18+

**OpenAI API errors:**

- Verify API key has sufficient credits and correct permissions
- Check rate limits and quotas in OpenAI dashboard
- Ensure the specified model (`OPENAI_MODEL`) is available
- Review token limits (`OPENAI_SESSION_MAX_TOKENS`) for context length

**Lazy initialization issues:**

- Agent starts successfully but connection happens on first request
- Check Cubicler 2.3 is running and accessible at `CUBICLER_URL`
- Review `MCP_CALL_TIMEOUT` and `MCP_MAX_RETRIES` for network issues
- Verify firewall and network connectivity between services

**Session and iteration problems:**

- Adjust `DISPATCH_SESSION_MAX_ITERATION` for complex multi-turn conversations
- Increase `DISPATCH_TIMEOUT` for longer-running sessions
- Monitor token usage against `OPENAI_SESSION_MAX_TOKENS` limits
