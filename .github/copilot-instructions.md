# CubicAgent-OpenAI AI Development Instructions

CubicAgent-OpenAI is a **ready-to-deploy OpenAI agent application** that integrates OpenAI's language models (GPT-4, GPT-4o, GPT-3.5-turbo) with Cubicler 2.3.0 using CubicAgentKit 2.3.0 as the foundation library. It's a complete, deployable solution that users can run immediately with just environment configuration.

## 🧱 System Overview

CubicAgent-OpenAI is a **deployable agent application** (not a library) that:
- Runs as a standalone HTTP server using Docker or npm
- Connects to an existing Cubicler instance via environment configuration with **lazy initialization**
- Uses OpenAI's Chat Completions API for natural language processing
- Automatically handles multi-turn conversations with session iteration limits
- Maps Cubicler's MCP tools to OpenAI's function calling format
- Provides robust retry logic for MCP communication failures
- Zero-code deployment - just configure .env and run

**Architecture Philosophy:**
- **Deployment-first** - Ready to run out of the box with minimal configuration
- **Built on CubicAgentKit 2.3.0** - Uses CubicAgent, AxiosAgentClient, and ExpressAgentServer with lazy initialization
- **Environment-driven** - All configuration via .env file with Zod validation
- **Session-aware** - Handles multi-turn conversations with iteration limits
- **Retry-resilient** - Automatic retry logic for MCP tool calls
- **Token-conscious** - Tracks and limits token usage per session
- **Lazy initialization** - Only connects to Cubicler on first dispatch request

## 🏗️ Core Architecture Principles

### CubicAgentKit Foundation
CubicAgent-OpenAI is built on top of CubicAgentKit 2.3.0's composition architecture with lazy initialization:

**Foundation Dependency:**
```bash
npm install @cubicler/cubicagentkit@^2.3.0
```

**Core Components:**
- **CubicAgent** - Main orchestrator from CubicAgentKit with lazy initialization support
- **AxiosAgentClient** - HTTP client for Cubicler MCP communication
- **ExpressAgentServer** - HTTP server for agent endpoints
- **OpenAI Service** - Handles OpenAI API integration and iterative function calling

### Lazy Initialization Architecture
CubicAgentKit 2.3.0 provides built-in lazy initialization - the agent only connects to Cubicler when the first dispatch request arrives:

**Lazy Initialization Flow:**
1. Application starts with HTTP server listening on configured port
2. CubicAgent is configured with Cubicler URL but doesn't connect immediately
3. On first agent request, CubicAgentKit automatically initializes the connection
4. Subsequent requests use the established connection
5. No manual initialization code needed in application

**Key Benefits:**
- **Fast startup** - Application starts immediately without waiting for Cubicler connection
- **Fault tolerance** - Can start even if Cubicler is temporarily unavailable
- **Resource efficiency** - Only establishes connection when needed
- **Automatic handling** - CubicAgentKit manages the initialization lifecycle

### Session Management Architecture
Handles multi-turn conversations with OpenAI while respecting limits:

**Session Flow:**
1. Receive agent request from Cubicler
2. Start session iteration loop (up to `DISPATCH_SESSION_MAX_ITERATION`)
3. Get available tools from Cubicler via MCP
4. Map Cubicler tools to OpenAI function schemas
5. Send request to OpenAI with available functions
6. If OpenAI requests tool calls, execute via Cubicler with retry logic
7. Continue iteration or return final response

**Key Limits:**
- **Session iterations** - Prevent infinite tool calling loops
- **Token limits** - Control OpenAI response size per session
- **MCP retries** - Handle temporary communication failures
- **Dispatch timeout** - Overall request timeout protection

### OpenAI Integration Patterns
Following OpenAI's best practices while maintaining Cubicler compatibility:

**Function Calling Flow:**
- Convert Cubicler MCP tool schemas to OpenAI function definitions
- Handle OpenAI's function calling responses
- Execute tool calls through Cubicler's MCP endpoint
- Format tool results back to OpenAI for continued conversation

**Error Handling Strategy:**
- OpenAI API errors (rate limits, context length, invalid requests)
- MCP communication failures with exponential backoff retry
- Session timeout and iteration limit enforcement
- Graceful degradation when tools are unavailable

## 📦 Project Structure

```
src/
  index.ts                         # Application entry point and startup with lazy initialization
  config/
    environment.ts                 # Environment variable validation with Zod
    types.ts                       # Configuration type definitions
  core/
    openai-service.ts              # OpenAI API integration service with iterative function calling
  utils/
    message-helper.ts              # Message format conversion utilities
tests/
  setup.ts                         # Test configuration and setup
  integration/
    openai-service.integration.test.ts # Integration tests with OpenAI API
  unit/
    config/
      environment.test.ts          # Configuration validation tests
    core/
      openai-service.test.ts       # Unit tests for OpenAI service
    utils/
      message-helper.test.ts       # Message helper unit tests
package.json                       # npm scripts and dependencies (uses Vitest for testing)
.env.example                       # Example environment configuration
README.md                          # Deployment and usage documentation
Dockerfile                         # Docker build configuration  
docker-compose.yml                 # Docker compose for local development
vitest.config.ts                   # Vitest test configuration
eslint.config.js                   # ESLint configuration
tsconfig.json                      # TypeScript configuration
LICENSE                           # Apache 2.0 license
```

## ⚙️ Environment Configuration

### Core Environment Variables (11 total)

The application uses **11 environment variables** for configuration:

**Required Variables (1):**
```env
CUBICLER_URL                     # Cubicler instance URL (required for MCP communication)
```

**OpenAI Configuration (4 core + 5 optional):**
```env
# Core OpenAI Settings
OPENAI_API_KEY                   # OpenAI API key (required)
OPENAI_MODEL                     # Model: gpt-4o, gpt-4, gpt-4-turbo, gpt-3.5-turbo
OPENAI_TEMPERATURE               # Temperature: 0.0 - 2.0 (controls randomness)
OPENAI_SESSION_MAX_TOKENS        # Max tokens per session/response

# Optional OpenAI Settings
OPENAI_ORG_ID                    # OpenAI organization ID (optional)
OPENAI_PROJECT_ID                # OpenAI project ID (optional)
OPENAI_BASE_URL                  # Custom API base URL (optional)
OPENAI_TIMEOUT                   # API timeout in milliseconds (default: 600000)
OPENAI_MAX_RETRIES               # Max retry attempts for OpenAI API (default: 2)
```

**Dispatch and Communication Settings (6):**
```env
DISPATCH_TIMEOUT                 # Overall request timeout in milliseconds (default: 30000)
MCP_MAX_RETRIES                  # Max retry attempts for MCP communication (default: 3)
MCP_CALL_TIMEOUT                 # Individual MCP call timeout in milliseconds (default: 10000)
DISPATCH_SESSION_MAX_ITERATION   # Max iterations per conversation session (default: 10)
DISPATCH_ENDPOINT                # Agent endpoint path (default: /)
AGENT_PORT                       # HTTP server port (default: 3000)
```

### Configuration Types

```typescript
interface OpenAIConfig {
  apiKey: string;
  model: 'gpt-4o' | 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  temperature: number;              // 0.0 - 2.0
  sessionMaxTokens: number;         // Token limit per response
  organization?: string;            // Optional OpenAI organization ID
  project?: string;                 // Optional OpenAI project ID
  baseURL?: string;                 // Optional custom API base URL
  timeout: number;                  // API timeout (default: 600000ms)
  maxRetries: number;               // Max retry attempts (default: 2)
}

interface DispatchConfig {
  timeout: number;                  // Overall request timeout (ms)
  mcpMaxRetries: number;           // MCP retry attempts
  mcpCallTimeout: number;          // Individual MCP call timeout (ms)
  sessionMaxIteration: number;      // Max conversation turns
  endpoint: string;                 // Agent endpoint path
  agentPort: number;               // HTTP server port
}
```

## 🎯 Core Services & Responsibilities

### OpenAIService
**Purpose:** Handle all OpenAI API communication and iterative function calling loop
**Key Responsibilities:**
- Execute iterative function calling loop with `DISPATCH_SESSION_MAX_ITERATION` limit
- Manage conversation history across multiple OpenAI API calls within a session
- Build dynamic tools array from available functions via CubicAgentKit
- Handle OpenAI Chat Completions with function calling enabled
- Track token usage and enforce `OPENAI_SESSION_MAX_TOKENS` limits
- Process tool calls through CubicAgent and continue conversation until final response

**Required Behavior:**
- Use CubicAgent to get available tools from Cubicler via MCP
- Convert Cubicler tools to OpenAI function schema format
- Maintain full conversation context including assistant messages and tool results
- Stop iteration when OpenAI returns message without tool calls (final response)
- Handle MCP retry logic through CubicAgentKit

### MessageBuilder
**Purpose:** Convert between Cubicler and OpenAI message formats with iteration awareness  
**Key Responsibilities:**
- Convert `AgentRequest.messages` to OpenAI message format
- Build system prompts with iteration context
- Maintain conversation continuity by preserving tool calls and results
- Clean final OpenAI responses by removing unwanted prefixes or agent names
- Format final response content for return to Cubicler

**Required Behavior:**
- Include iteration information in system messages (e.g., "Iteration 2 of 10")
- Preserve full conversation including assistant messages with tool_calls
- Add tool result messages to conversation before next OpenAI call  
- Clean final response content (remove prefixes like agent names)
- Return clean text content as final response to Cubicler

### SessionManager
**Purpose:** Control session flow and iteration limits
**Key Responsibilities:**
- Enforce `DISPATCH_SESSION_MAX_ITERATION` limits
- Coordinate between OpenAI calls and tool executions  
- Handle session timeout and termination conditions
- Track session metrics (tokens, tools, iterations)

## 🔧 Key Implementation Patterns

### Session Iteration Loop
The main request handler in OpenAIService implements a controlled loop:
1. **Initialize session** - Set up iteration counter and context
2. **Get tools** - Fetch available Cubicler tools via MCP with CubicAgent
3. **OpenAI request** - Send to OpenAI with function definitions
4. **Tool execution** - If OpenAI requests tools, execute with retry logic
5. **Iteration check** - Continue loop or return final response
6. **Cleanup** - Log session metrics and cleanup resources

### MCP Retry Logic
All MCP tool calls implement exponential backoff retry through CubicAgentKit:
- Initial attempt with no delay
- Retry with increasing delays: 1s, 2s, 4s, etc.
- Respect `MCP_MAX_RETRIES` configuration
- Log retry attempts for debugging
- Fail gracefully after max retries

### Error Handling Strategy
Different error types handled appropriately:
- **OpenAI errors** - Rate limits, context length, API failures
- **MCP errors** - Connection failures, timeout, invalid responses  
- **Configuration errors** - Invalid environment variables
- **Session errors** - Iteration limits, timeout, resource exhaustion

## 🚀 Deployment Patterns

### Docker Deployment
- **Single container** - Contains Node.js app and dependencies
- **Environment file** - All configuration via .env file
- **Health checks** - Basic HTTP endpoint health verification
- **Resource limits** - Appropriate memory/CPU limits for OpenAI usage

### npm Package Deployment  
- **Global installation** - `npm install -g @cubicler/cubicagent-openai`
- **Binary executable** - Direct command-line execution
- **Configuration validation** - Environment validation on startup
- **Process management** - Proper signal handling for graceful shutdown

### Development Workflow
- **Local development** - `npm run dev` with watch mode
- **Environment validation** - Zod schema validation on startup
- **Structured logging** - JSON logging with correlation IDs
- **Integration testing** - Tests against real Cubicler and OpenAI APIs

## 🧪 Testing Strategy

### Integration Tests
- **Cubicler communication** - Full MCP protocol testing
- **OpenAI integration** - Real API calls with test accounts
- **Session management** - Multi-turn conversation flows
- **Error scenarios** - Network failures, API errors, timeouts

### Unit Tests  
- **Service isolation** - Mock external dependencies
- **Configuration validation** - Environment variable edge cases
- **Error handling** - All error paths and retry logic
- **Tool mapping** - Schema conversion accuracy

### Load Testing
- **Concurrent sessions** - Multiple simultaneous conversations
- **Token usage patterns** - Monitor memory and performance
- **Retry behavior** - Network instability simulation
- **Resource limits** - Container resource exhaustion testing

## 🔍 Monitoring and Observability

### Structured Logging
Session-based logging with correlation IDs:
- **Session lifecycle** - Start, iterations, completion, errors
- **OpenAI interactions** - Requests, responses, token usage
- **MCP communications** - Tool calls, retries, failures
- **Performance metrics** - Response times, resource usage

### Key Metrics
Application-specific metrics for monitoring:
- **Token consumption** - Per session and cumulative usage
- **Session statistics** - Iteration counts, completion rates  
- **Tool usage patterns** - Most called tools, success rates
- **Error rates** - By type (OpenAI, MCP, configuration)
- **Performance data** - Response times, CubicAgentKit lazy initialization timing

## 🧪 Testing Strategy

The project uses **Vitest** as the testing framework with the following test structure:

### Test Categories
- **Unit Tests** (`tests/unit/`) - Test individual components in isolation
  - Configuration validation
  - Message helper functions
  - OpenAI service logic
- **Integration Tests** (`tests/integration/`) - Test complete workflows
  - OpenAI API integration
  - End-to-end session flows

### Test Commands
```bash
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:unit           # Run only unit tests
npm run test:integration    # Run only integration tests  
npm run test:coverage       # Run tests with coverage report
```

### Testing Approach
- **Mock external dependencies** in unit tests (OpenAI API, CubicAgent)
- **Use real API calls** in integration tests when configured
- **Environment variable validation** with comprehensive error cases
- **Session iteration logic** with various scenarios and limits
- **Error handling paths** including retry logic and timeout cases

## ✅ Your Role

When I ask you for code, your job is to:
• **Maintain CubicAgentKit 2.3.0 patterns** - Use CubicAgent, AxiosAgentClient, ExpressAgentServer with lazy initialization
• **Preserve function calling loop** - Same iterative conversation with tool building via CubicAgent.getTools()
• **Keep OpenAI integration patterns** - Same message conversion, tool building, response cleaning  
• **Map configuration properly** - Use the 11 environment variables as specified
• **Implement session flow** - Tool discovery → function loading → iterative execution
• **Handle lazy initialization** - Let CubicAgentKit 2.3.0 handle connection timing automatically
• **Maintain error handling** - Same error response patterns and iteration limits

## ✅ DO NOT

• Do not add additional environment variables beyond the specified 11
• Do not implement complex health check endpoints - keep it simple
• Do not include Docker scripts folder - keep Dockerfile in root
• Do not add Prometheus metrics or complex monitoring - use structured logs
• Do not implement streaming responses - use standard completion format
• Do not add authentication middleware - focus on core OpenAI integration
• Do not over-engineer the session management - keep it straightforward
• Do not include multiple deployment configurations - one Dockerfile only
• Do not add manual initialization code - let CubicAgentKit 2.1.0 handle lazy initialization

When working on CubicAgent-OpenAI, focus on creating a robust, production-ready OpenAI agent that seamlessly integrates with Cubicler using the CubicAgentKit 2.3.0 foundation while maintaining simplicity and reliability.