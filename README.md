# CubicAgent-OpenAI 🤖

A **ready-to-deploy OpenAI agent application and npm library** that integrates OpenAI's language models (GPT-4, GPT-4o, GPT-3.5-turbo) with [Cubicler 2.3](https://github.com/hainayanda/Cubicler) using [`@cubicler/cubicagentkit@^2.3.4`](https://www.npmjs.com/package/@cubicler/cubicagentkit) as the foundation library.

## 🎯 Overview

CubicAgent-OpenAI is both a **deployable agent application** and a **reusable npm library** that:

- ✅ **NPM Package** - Available as `@cubicler/cubicagent-openai` with CLI and library exports
- ✅ **Multiple transport modes** - HTTP, SSE (Server-Sent Events), and stdio communication support
- ✅ **JWT Authentication** - Full OAuth and static token support for secure communications
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
# For SSE transport (real-time):
# SSE_URL=http://localhost:8080
# SSE_AGENT_ID=my-unique-agent-id
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

#### Using the Factory (Recommended)

```typescript
import { createOpenAIServiceFromEnv } from '@cubicler/cubicagent-openai';

// Create service from environment variables (automatically handles all configuration)
const service = await createOpenAIServiceFromEnv();

// Start the service
await service.start();
```

#### Direct Service Construction (Advanced)

```typescript
import { CubicAgent, HttpAgentClient, HttpAgentServer } from '@cubicler/cubicagentkit';
import { OpenAIService } from '@cubicler/cubicagent-openai';

// Create CubicAgent with HTTP transport
const client = new HttpAgentClient('http://localhost:8080');
const server = new HttpAgentServer(3000);
const cubicAgent = new CubicAgent(client, server);

// Create OpenAI configuration
const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o' as const,
  temperature: 0.7,
  sessionMaxTokens: 4096
};

const dispatchConfig = {
  timeout: 30000,
  mcpMaxRetries: 3,
  sessionMaxIteration: 10,
  endpoint: '/',
  agentPort: 3000,
  mcpCallTimeout: 10000
};

// Initialize service
const service = new OpenAIService(cubicAgent, openaiConfig, dispatchConfig);
await service.start();
```

#### SSE Transport (Real-time)

```typescript
import { CubicAgent, HttpAgentClient, SSEAgentServer } from '@cubicler/cubicagentkit';
import { OpenAIService } from '@cubicler/cubicagent-openai';

// Create CubicAgent with SSE transport for real-time communication
const client = new HttpAgentClient('http://localhost:8080');
const server = new SSEAgentServer('http://localhost:8080', 'my-agent-id');
const cubicAgent = new CubicAgent(client, server);

// Initialize service with SSE
const service = new OpenAIService(cubicAgent, openaiConfig, dispatchConfig);
await service.start();
```

#### Using with Memory Integration

```typescript
import { createOpenAIServiceFromEnv } from '@cubicler/cubicagent-openai';

// Set memory environment variables
process.env.MEMORY_ENABLED = 'true';
process.env.MEMORY_TYPE = 'sqlite';
process.env.MEMORY_DB_PATH = './agent-memory.db';

// Service automatically includes memory tools
const service = await createOpenAIServiceFromEnv();
await service.start();
```

#### Processing Individual Requests (Injected Agent)

```typescript
import { OpenAIService } from '@cubicler/cubicagent-openai';
import type { AgentRequest, AgentClient } from '@cubicler/cubicagentkit';

// Use existing CubicAgent instance (for injection scenarios)
const service = new OpenAIService(existingCubicAgent, openaiConfig, dispatchConfig);

// Process a single request using the new dispatch method
const response = await service.dispatch(request);
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
// Main service and factory
import { OpenAIService, createOpenAIServiceFromEnv } from '@cubicler/cubicagent-openai';

// Utility functions
import { 
  buildSystemMessage, 
  buildOpenAIMessages,
  cleanFinalResponse 
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

## � Summarizer Tools (New)

CubicAgent-OpenAI includes an optional **AI-powered summarizer feature** that automatically creates summarizer variants of all available MCP tools. This allows you to get focused, intelligent summaries of tool results tailored to your specific needs.

### How It Works

When enabled, the summarizer feature:

1. **Automatically wraps MCP tools** - Creates `summarize_toolName` variants for each discovered tool
2. **Dynamic registration** - Summarizer tools are added when new MCP tools are fetched
3. **AI-powered analysis** - Uses a dedicated OpenAI model to generate focused summaries
4. **Parameter passthrough** - All original tool parameters work exactly the same
5. **Custom prompting** - Uses `_prompt` parameter for summarization instructions

### Summarizer Configuration

Add the following environment variable to enable summarizer tools:

```env
# Enable summarizer feature with dedicated model
OPENAI_SUMMARIZER_MODEL=gpt-4o-mini
```

**Benefits of using `gpt-4o-mini` for summarization:**

- ✅ **Cost-effective** - Lower cost per token than main models
- ✅ **Fast** - Optimized for quick processing
- ✅ **Focused** - Perfect for analysis and summarization tasks
- ✅ **Separate quota** - Doesn't consume main model tokens

### Usage Examples

#### Basic Summarization

```json
{
  "name": "summarize_getLogs",
  "arguments": {
    "_prompt": "Focus on errors only",
    "userId": 123,
    "timeRange": "24h"
  }
}
```

This will:

1. Execute `getLogs` with `userId: 123` and `timeRange: "24h"`
2. Pass the results to `gpt-4o-mini` with the prompt "Focus on errors only"
3. Return both the original results and the AI-generated summary

#### Advanced Summarization

```json
{
  "name": "summarize_searchDocuments",
  "arguments": {
    "_prompt": "Extract the 3 most relevant findings and highlight any security concerns",
    "query": "authentication vulnerabilities",
    "limit": 50,
    "includeMetadata": true
  }
}
```

#### Common Summarization Prompts

```json
// Focus on specific aspects
"_prompt": "Highlight any errors or warnings"
"_prompt": "Extract key metrics and performance indicators"
"_prompt": "Summarize main findings in bullet points"
"_prompt": "Focus on recent changes or updates"

// Analysis and insights
"_prompt": "Identify patterns and trends in the data"
"_prompt": "Highlight anomalies or unexpected results"
"_prompt": "Extract actionable items and recommendations"
"_prompt": "Compare current vs expected values"

// Format-specific requests
"_prompt": "Provide a technical summary for developers"
"_prompt": "Create an executive summary for stakeholders"
"_prompt": "List the top 5 most important items"
"_prompt": "Explain the results in simple terms"
```

### Tool Response Format

Summarizer tools return enhanced responses with token usage tracking:

```typescript
{
  success: true,
  message: "Tool executed and summarized successfully",
  originalTool: "getLogs",           // Original tool name
  originalResult: { /* raw data */ }, // Complete original results
  summary: "AI-generated summary...", // Focused summary based on _prompt
  tokensUsed: 45                     // Tokens consumed by summarization
}
```

**Token Usage Benefits:**

- 📊 **Cost tracking** - Monitor summarization costs separately from main model
- 📈 **Usage analytics** - Track which tools generate the most summarization overhead
- 💰 **Budget control** - Set limits and alerts based on summarization token usage
- 🔍 **Optimization insights** - Identify opportunities to improve prompt efficiency

### Automatic Documentation

When summarizer tools are available, they're automatically documented in the system prompt:

```text
## Summarizer Tools Available
You have access to 5 summarizer tools that can execute other tools and provide AI-powered summaries of their results.

**Available Summarizer Tools:**
- summarize_getLogs: Execute getLogs and summarize results based on your prompt
- summarize_fetchUser: Execute fetchUser and summarize results based on your prompt
- summarize_searchDocs: Execute searchDocs and summarize results based on your prompt

**How to use summarizer tools:**
- Include a "_prompt" parameter with specific instructions for summarization
- Example: "Focus on errors only", "Highlight key metrics", "Extract main findings"
- All other parameters are passed directly to the original tool
- The summarizer will execute the tool and provide a focused, relevant summary

**When to use summarizers:**
- When you need a focused view of tool results
- To extract specific information from large datasets
- To get insights tailored to the user's current question
- To reduce information overload from verbose tool outputs
```

### Benefits

✅ **Intelligent filtering** - Extract only relevant information from large datasets  
✅ **Cost-effective** - Use cheaper models for summarization while keeping premium models for reasoning  
✅ **Contextual insights** - Get summaries tailored to your specific questions  
✅ **Reduced cognitive load** - Process large tool outputs more efficiently  
✅ **Custom perspectives** - Same data, different viewpoints based on prompts  
✅ **Automatic integration** - No manual configuration needed, works with any MCP tool  

### Parameter Safety

The `_prompt` parameter uses an underscore prefix to prevent collisions with real tool parameters:

- ✅ **Collision-safe** - `_prompt` is very unlikely to conflict with existing parameters
- ✅ **OpenAI compatible** - Underscore-prefixed parameters are fully supported
- ✅ **Clear indication** - Underscore prefix clearly marks internal parameters
- ✅ **JSON Schema compliant** - Follows standard parameter naming conventions

### Architecture

```text
User Request → summarize_toolName(params + _prompt)
                        ↓
            Execute original tool with params
                        ↓
               Get raw tool results
                        ↓
          Send to OPENAI_SUMMARIZER_MODEL with _prompt
                        ↓
        Return both original results + AI summary
```

This approach ensures you always have access to both the complete data and the focused insights you need.

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
- **Environment Configuration**: Zod-based validation for all environment variables
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
| `OPENAI_API_KEY` | **Yes** | - | OpenAI API key |
| `TRANSPORT_MODE` | No | `http` | Transport mode: `http`, `sse`, or `stdio` |
| `CUBICLER_URL` | **Yes*** | - | Cubicler instance URL for HTTP/MCP communication |
| `SSE_URL` | **Yes*** | - | SSE server URL for real-time communication (SSE mode only) |
| `SSE_AGENT_ID` | **Yes*** | - | Unique agent identifier for SSE connection (SSE mode only) |
| `STDIO_COMMAND` | **Yes*** | - | Command for stdio transport (stdio mode only) |
| `STDIO_ARGS` | No | - | Arguments for stdio command (stdio mode only) |
| `STDIO_CWD` | No | - | Working directory for stdio process (optional) |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model: gpt-4o, gpt-4, gpt-4-turbo, gpt-3.5-turbo |
| `OPENAI_TEMPERATURE` | No | `0.7` | Response creativity (0.0-2.0) |
| `OPENAI_SESSION_MAX_TOKENS` | No | `4096` | Maximum tokens per session/response |
| `OPENAI_ORG_ID` | No | - | OpenAI organization ID (optional) |
| `OPENAI_PROJECT_ID` | No | - | OpenAI project ID (optional) |
| `OPENAI_BASE_URL` | No | - | Custom API base URL (optional) |
| `OPENAI_TIMEOUT` | No | `600000` | API timeout in milliseconds |
| `OPENAI_MAX_RETRIES` | No | `2` | Max retry attempts for OpenAI API |
| `OPENAI_SUMMARIZER_MODEL` | No | - | Model for AI-powered summarization (enables summarizer tools) |
| `DISPATCH_TIMEOUT` | No | `30000` | Overall request timeout (ms) |
| `MCP_MAX_RETRIES` | No | `3` | Max retry attempts for MCP communication |
| `MCP_CALL_TIMEOUT` | No | `10000` | Individual MCP call timeout (ms) |
| `DISPATCH_SESSION_MAX_ITERATION` | No | `10` | Max iterations per conversation session |
| `DISPATCH_ENDPOINT` | No | `/` | Agent endpoint path (HTTP mode only) |
| `AGENT_PORT` | No | `3000` | HTTP server port (HTTP mode only) |

*Required based on transport mode: `CUBICLER_URL` for HTTP, `SSE_URL` and `SSE_AGENT_ID` for SSE, `STDIO_COMMAND` for stdio.

#### JWT Authentication (New in 2.3.3)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_ENABLED` | No | `false` | Enable JWT authentication |
| `JWT_TYPE` | No | `static` | JWT type: `static` or `oauth` |
| `JWT_TOKEN` | No | - | Static JWT token (required if type=static) |
| `JWT_CLIENT_ID` | No | - | OAuth client ID (required if type=oauth) |
| `JWT_CLIENT_SECRET` | No | - | OAuth client secret (required if type=oauth) |
| `JWT_TOKEN_ENDPOINT` | No | - | OAuth token endpoint URL (required if type=oauth) |
| `JWT_SCOPE` | No | - | OAuth scope (optional) |
| `JWT_GRANT_TYPE` | No | `client_credentials` | OAuth grant type |
| `JWT_REFRESH_TOKEN` | No | - | OAuth refresh token (optional) |
| `JWT_VERIFICATION_SECRET` | No | - | JWT verification secret for server (optional) |
| `JWT_VERIFICATION_PUBLIC_KEY` | No | - | JWT verification public key for server (optional) |
| `JWT_ALGORITHMS` | No | `HS256` | JWT verification algorithms (comma-separated) |
| `JWT_ISSUER` | No | - | JWT issuer validation (optional) |
| `JWT_AUDIENCE` | No | - | JWT audience validation (optional) |
| `JWT_IGNORE_EXPIRATION` | No | `false` | Ignore JWT expiration during verification |

#### Memory Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MEMORY_ENABLED` | No | `false` | Enable sentence-based memory system |
| `MEMORY_TYPE` | No | `memory` | Memory storage: `memory` or `sqlite` |
| `MEMORY_DB_PATH` | No | `./memories.db` | SQLite database path (if type=sqlite) |
| `MEMORY_MAX_TOKENS` | No | `2000` | Short-term memory token limit |
| `MEMORY_DEFAULT_IMPORTANCE` | No | `0.5` | Default importance score (0-1) |

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
