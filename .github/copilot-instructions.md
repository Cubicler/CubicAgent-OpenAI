# CubicAgent-OpenAI AI Development Instructions

CubicAgent-OpenAI is a **ready-to-deploy OpenAI agent application and npm library** that integrates OpenAI's language models (GPT-4, GPT-4o, GPT-3.5-turbo) with Cubicler 2.3.0 using CubicAgentKit 2.3.1 as the foundation library. It's both a complete, deployable solution that users can run immediately with just environment configuration, and a reusable npm library for integration into other projects.

## 🧱 System Overview

CubicAgent-OpenAI is both a **deployable agent application** and a **reusable npm library** that:
- Available as `@cubicler/cubicagent-openai` npm package with CLI and library exports
- Runs as a standalone HTTP server using Docker or npm
- Can be integrated as a library in other Node.js projects
- Connects to an existing Cubicler instance via environment configuration with **lazy initialization**
- Uses OpenAI's Chat Completions API for natural language processing
- Automatically handles multi-turn conversations with session iteration limits
- Maps Cubicler's MCP tools to OpenAI's function calling format
- Provides robust retry logic for MCP communication failures
- Zero-code deployment - just configure .env and run
- Full TypeScript support with clean exports for library usage

**Architecture Philosophy:**
- **Deployment-first** - Ready to run out of the box with minimal configuration
- **Library-ready** - Clean npm package exports for integration into other projects
- **Built on CubicAgentKit 2.3.1** - Uses CubicAgent, AxiosAgentClient, and ExpressAgentServer with lazy initialization
- **Environment-driven** - All configuration via .env file with Zod validation
- **Session-aware** - Handles multi-turn conversations with iteration limits
- **Retry-resilient** - Automatic retry logic for MCP tool calls
- **Token-conscious** - Tracks and limits token usage per session
- **Lazy initialization** - Only connects to Cubicler on first dispatch request
- **TypeScript-first** - Full type definitions and modern ES modules support

## 🏗️ Core Architecture Principles

### CubicAgentKit Foundation
CubicAgent-OpenAI is built on top of CubicAgentKit 2.3.1's composition architecture with lazy initialization:

**Foundation Dependency:**
```bash
npm install @cubicler/cubicagentkit@^2.3.1
```

**Core Components:**
- **CubicAgent** - Main orchestrator from CubicAgentKit with lazy initialization support
- **AxiosAgentClient** - HTTP client for Cubicler MCP communication
- **ExpressAgentServer** - HTTP server for agent endpoints
- **OpenAI Service** - Handles OpenAI API integration and iterative function calling

### Lazy Initialization Architecture
CubicAgentKit 2.3.1 provides built-in lazy initialization - the agent only connects to Cubicler when the first dispatch request arrives:

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
  index.ts                         # Application entry point and startup with CLI and library exports
  config/
    environment.ts                 # Environment variable validation with Zod
    types.ts                       # Configuration type definitions
  core/
    agent-memory-handler.ts        # Memory integration with MCP tool handling
    openai-service.ts              # OpenAI API integration service with iterative function calling
  models/
    types.ts                       # Core type definitions and interfaces
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
      agent-memory-handler.test.ts # Memory handler unit tests
      openai-service.test.ts       # Unit tests for OpenAI service
    utils/
      message-helper.test.ts       # Message helper unit tests
package.json                       # npm package metadata with binary entry and library exports
.env.example                       # Example environment configuration
README.md                          # Deployment and library usage documentation
Dockerfile                         # Docker build configuration  
docker-compose.yml                 # Docker compose for local development
vitest.config.ts                   # Vitest test configuration
eslint.config.js                   # ESLint configuration
tsconfig.json                      # TypeScript configuration
LICENSE                           # Apache 2.0 license
```

## ⚙️ Environment Configuration

### Core Environment Variables (16 total)

The application uses **16 environment variables** for configuration:

**Required Variables (1):**
```env
OPENAI_API_KEY                   # OpenAI API key (required)
```

**Transport Configuration:**
```env
TRANSPORT_MODE                   # Transport mode: http, stdio (default: http)
CUBICLER_URL                     # Cubicler instance URL for HTTP transport
STDIO_COMMAND                    # Command for stdio transport (optional)
STDIO_ARGS                       # Arguments for stdio command (optional)
STDIO_CWD                        # Working directory for stdio command (optional)
```

**OpenAI Configuration:**
```env
OPENAI_MODEL                     # Model: gpt-4o, gpt-4, gpt-4-turbo, gpt-3.5-turbo (default: gpt-4o)
OPENAI_TEMPERATURE               # Temperature: 0.0 - 2.0 (default: 0.7)
OPENAI_SESSION_MAX_TOKENS        # Max tokens per session/response (default: 4096)
OPENAI_ORG_ID                    # OpenAI organization ID (optional)
OPENAI_PROJECT_ID                # OpenAI project ID (optional)
OPENAI_BASE_URL                  # Custom API base URL (optional)
OPENAI_TIMEOUT                   # API timeout in milliseconds (default: 600000)
OPENAI_MAX_RETRIES               # Max retry attempts for OpenAI API (default: 2)
```

**Memory Configuration (optional):**
```env
MEMORY_ENABLED                   # Enable memory integration (default: false)
MEMORY_TYPE                      # Memory type: memory, sqlite (default: memory)
MEMORY_DB_PATH                   # SQLite database path (default: ./memories.db)
MEMORY_MAX_TOKENS                # Max tokens for memory context (default: 2000)
MEMORY_DEFAULT_IMPORTANCE        # Default importance for memories (default: 0.5)
```

**Dispatch and Communication Settings:**
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
- **Project dependency** - `npm install @cubicler/cubicagent-openai`
- **Binary executable** - Direct command-line execution with npx
- **Library integration** - Clean imports for use in other Node.js projects
- **Configuration validation** - Environment validation on startup
- **Process management** - Proper signal handling for graceful shutdown

### Library Usage Patterns
- **Standalone service** - Import and configure OpenAI service directly
- **HTTP transport** - Connect to external Cubicler instance
- **Stdio transport** - Launch Cubicler as subprocess
- **Injected agent** - Use with existing CubicAgent instance
- **TypeScript support** - Full type definitions and intellisense

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
• **Maintain CubicAgentKit 2.3.1 patterns** - Use CubicAgent, AxiosAgentClient, ExpressAgentServer with lazy initialization
• **Preserve function calling loop** - Same iterative conversation with tool building via CubicAgent.getTools()
• **Keep OpenAI integration patterns** - Same message conversion, tool building, response cleaning  
• **Map configuration properly** - Use the 16 environment variables as specified
• **Implement session flow** - Tool discovery → function loading → iterative execution
• **Handle lazy initialization** - Let CubicAgentKit 2.3.1 handle connection timing automatically
• **Maintain error handling** - Same error response patterns and iteration limits
• **Support dual usage** - Ensure code works both as standalone application and npm library
• **Clean exports** - Provide clear TypeScript exports for library integration

## ✅ DO NOT

• Do not add additional environment variables beyond the specified 16
• Do not implement complex health check endpoints - keep it simple
• Do not include Docker scripts folder - keep Dockerfile in root
• Do not add Prometheus metrics or complex monitoring - use structured logs
• Do not implement streaming responses - use standard completion format
• Do not add authentication middleware - focus on core OpenAI integration
• Do not over-engineer the session management - keep it straightforward
• Do not include multiple deployment configurations - one Dockerfile only
• Do not add manual initialization code - let CubicAgentKit 2.3.1 handle lazy initialization

When working on CubicAgent-OpenAI, focus on creating a robust, production-ready OpenAI agent that seamlessly integrates with Cubicler using the CubicAgentKit 2.3.1 foundation while maintaining simplicity and reliability. Ensure the code works both as a standalone deployable application and as a reusable npm library with clean TypeScript exports.

---

# Global Development Standards & Best Practices

> **Author Preferences:** These are my personal coding standards and preferences that should be followed across all projects, regardless of programming language.

## 🎯 Core Philosophy

Write code that is clean, maintainable, testable, and scalable. Always prioritize code readability and long-term maintainability over short-term convenience. Prefer simple, focused code over complex abstractions - it's better to have code that does one thing well than code that tries to be reusable for everything.

## 📐 SOLID Principles (Universal)

Always follow SOLID principles when writing code:

• **Single Responsibility Principle** - Each class/function/module should have one reason to change
• **Open/Closed Principle** - Open for extension, closed for modification
• **Liskov Substitution Principle** - Derived classes must be substitutable for their base classes
• **Interface Segregation Principle** - Many specific interfaces are better than one general-purpose interface
• **Dependency Inversion Principle** - Depend on abstractions, not concretions

## 🛠️ Method & Function Design

### Method Length & Complexity
• Break down long methods/functions into smaller, focused units that each handle a specific responsibility
• Avoid redundant wrapper methods that only call one private method without additional logic
• Single responsibility per method - each method should do one thing well
• Meaningful names that clearly describe what the method does

### Parameters & Return Values
• Limit parameters - if you need more than 3-4 parameters, consider using a configuration object/struct
• Consistent return types - avoid functions that sometimes return different types
• Fail fast - validate inputs early and throw meaningful errors

## 🏗️ Architecture Principles

### Modularity & Separation of Concerns
• Service-oriented design with clear separation of responsibilities
• Dependency injection for testability and flexibility
• Interface/contract-based programming - depend on abstractions, not implementations
• Avoid monolithic classes/modules - break them into focused, cohesive units

### Error Handling
• Throw errors, don't catch and ignore - let errors bubble up unless they are expected and recoverable
• Fail fast - validate inputs early and throw meaningful errors immediately
• Consistent error handling patterns across the entire codebase
• Meaningful error messages that help developers understand what went wrong and how to fix it
• Log at appropriate levels with context and structured data
• Only catch errors you can handle - if you can't recover or provide meaningful handling, let it throw
• Expected errors should be handled gracefully - but unexpected errors should surface quickly

## 📝 Code Quality Standards

### Naming Conventions
• Descriptive names - code should be self-documenting
• Consistent naming patterns within each project/language
• Avoid abbreviations unless they're industry standard
• Boolean variables/functions should be clearly boolean (is/has/can/should prefixes)

### Comments & Documentation
• Code should be self-documenting - prefer clear code over comments
• Document the "why", not the "what" - explain business logic and decisions
• Keep documentation up-to-date with code changes
• API documentation for all public interfaces

### Testing Philosophy
• Write testable code - design with testing in mind
• Unit tests for business logic - test behavior, not implementation
• Integration tests for workflows - test how components work together
• Test edge cases and error conditions

## 🔄 Development Workflow

### Refactoring
• Continuous refactoring - improve code quality incrementally
• Test before and after refactoring to ensure behavior is preserved
• Remove dead code - don't leave commented-out code
• DRY principle with wisdom - Don't Repeat Yourself, but avoid premature abstraction and forced reuse
• Prefer simple duplication over complex abstraction - if reuse makes code complicated, duplicate and keep it simple
• One thing well - better to have multiple simple functions than one complex reusable one

## ⚡ Performance Considerations

### Optimization Philosophy
• Measure before optimizing - profile and identify actual bottlenecks
• Readability first, optimize later - don't sacrifice clarity for micro-optimizations
• Cache appropriately - but avoid premature caching
• Consider scalability from the design phase

### Resource Management
• Clean up resources - close files, connections, release memory appropriately
• Efficient algorithms - choose appropriate data structures and algorithms
• Lazy loading where appropriate to improve startup time

## 🔒 Security Best Practices

### Input Validation
• Validate all inputs at system boundaries
• Sanitize data before processing or storage
• Use parameterized queries to prevent injection attacks
• Implement proper authentication and authorization

### Data Protection
• Never log sensitive data (passwords, tokens, personal info)
• Use environment variables for configuration and secrets
• Encrypt sensitive data at rest and in transit
• Follow principle of least privilege

## 🔧 Linting and Code Quality Rules

When fixing linting issues or working with code quality tools:

- **If the linter is wrong** (like when they said something unused, but it's actually used) just disable the linter on that particular warning or error with explanatory comments
- **If you need to add an import**, add it to the top of the file with other imports
- **Import that are allowed in middle of the file** are only the imports used for singleton instances (at the bottom of service files)
- **Always use proper TypeScript types** instead of `any` - create new type definitions when needed
- **For constructor parameters flagged as unused** but are actually used as dependency injection, use `// eslint-disable-next-line no-unused-vars` 
- **For safe non-null assertions** where you've verified the value exists, use `// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Safe: reason`
- **Remove truly unused imports** rather than disabling the warning
- **Fix formatting issues** automatically with `--fix` flag when possible

## ✅ Your Role as a Developer/AI Assistant

When working on any codebase, your job is to:

• Follow these global standards while adapting to language-specific conventions
• Write clean, maintainable code that other developers can easily understand and modify
• Think about long-term maintainability - code is read more often than it's written
• Design for extensibility - anticipate future changes and requirements
• Prioritize code quality over speed of delivery
• Ask questions when requirements are unclear rather than making assumptions
• Implement exactly what is requested - don't add features or functionality that wasn't asked for
• Consider the bigger picture - how does this code fit into the overall system?
• Be consistent with existing patterns and conventions in the codebase
• Document decisions that might not be obvious to future developers
• Test your code and consider edge cases

## ❌ DO NOT

• Do not sacrifice code quality for quick fixes or tight deadlines
• Do not write monolithic functions/classes - break them down into manageable pieces
• Do not ignore error handling - always consider what can go wrong and let errors surface
• Do not catch and swallow exceptions - only catch errors you can meaningfully handle or recover from
• Do not hide failures - if something fails, it should be visible and actionable
• Do not hardcode values - use configuration files or constants
• Do not copy-paste code without understanding what it does
• Do not leave TODO comments in production code without tracking them
• Do not commit commented-out code - use version control instead
• Do not ignore linting/formatting tools - consistency matters
• Do not skip documentation for public APIs and complex business logic
• Do not make breaking changes without proper versioning and migration paths
• Do not optimize prematurely - measure first, then optimize
• Do not force code reuse - avoid creating complicated abstractions just to eliminate duplication
• Do not create "Swiss Army knife" functions - functions that try to do everything for everyone
• Do not sacrifice simplicity for reusability - simple, testable code is better than complex reusable code
• Do not reinvent the wheel - use established libraries and patterns when appropriate, but don't force custom reuse
• Do not ignore security considerations - think about potential vulnerabilities
• Do not add unrequested features - implement exactly what is asked for, nothing more
• Do not make assumptions about data or user behavior - validate everything
• Do not implement "nice to have" features without explicit request - stick to requirements

## 🎯 Language-Specific Notes

While these principles apply universally, remember to:

• Follow language idioms and established conventions
• Use language-specific tools for testing, linting, and formatting
• Leverage language strengths - don't fight the language design
• Stay updated with language best practices and evolving standards
• Use appropriate design patterns for the specific language/framework

## 📋 Quick Checklist

Before considering any piece of code "done":

- [ ] Does it follow SOLID principles?
- [ ] Is each method/function focused on a single responsibility?
- [ ] Are names descriptive and consistent?
- [ ] Is error handling appropriate and consistent?
- [ ] Is it testable and tested?
- [ ] Is it documented where necessary?
- [ ] Does it follow project conventions?
- [ ] Is it secure and performant enough?
- [ ] Will it be maintainable in 6 months?

These standards are living guidelines that should evolve with experience and changing best practices. The goal is to write code that is a joy to work with, both now and in the future.