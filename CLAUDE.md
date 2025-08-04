# CubicAgent-OpenAI Development Instructions for Claude

CubicAgent-OpenAI is a **ready-to-deploy OpenAI agent** and **npm library** integrating OpenAI models with Cubicler 2.3.0 using CubicAgentKit 2.3.1. Built for zero-code deployment and library integration.

## 🧱 Core Architecture

**Built on CubicAgentKit 2.3.1:**

- `npm install @cubicler/cubicagentkit@^2.3.1`
- **CubicAgent** - Main orchestrator with lazy initialization
- **AxiosAgentClient** - HTTP client for Cubicler MCP
- **ExpressAgentServer** - HTTP server for endpoints
- **OpenAI Service** - Handles iterative function calling

**Key Features:**

- Lazy initialization (connects on first request)
- Session iteration loop with limits
- MCP tool mapping to OpenAI functions
- Exponential backoff retry logic
- Dual usage: standalone app + npm library
- Memory integration with SQLite or in-memory storage
- Multiple transport modes (HTTP, stdio)

## ⚙️ Environment Variables (16 total)

**Required:**

```env
OPENAI_API_KEY                   # OpenAI API key
```

**Transport:**

```env
TRANSPORT_MODE                   # http, stdio (default: http)
CUBICLER_URL                     # Cubicler instance URL
STDIO_COMMAND, STDIO_ARGS, STDIO_CWD  # Optional stdio config
```

**OpenAI:**

```env
OPENAI_MODEL                     # gpt-4o, gpt-4, gpt-4-turbo, gpt-3.5-turbo
OPENAI_TEMPERATURE               # 0.0-2.0 (default: 0.7)
OPENAI_SESSION_MAX_TOKENS        # Max tokens per session (default: 4096)
OPENAI_ORG_ID, OPENAI_PROJECT_ID, OPENAI_BASE_URL  # Optional
OPENAI_TIMEOUT, OPENAI_MAX_RETRIES  # API config
```

**Memory (optional):**

```env
MEMORY_ENABLED, MEMORY_TYPE, MEMORY_DB_PATH
MEMORY_MAX_TOKENS, MEMORY_DEFAULT_IMPORTANCE
```

**Dispatch:**

```env
DISPATCH_TIMEOUT, DISPATCH_SESSION_MAX_ITERATION
MCP_MAX_RETRIES, MCP_CALL_TIMEOUT
DISPATCH_ENDPOINT, AGENT_PORT
```

## 🎯 Core Services

### OpenAIService (`src/core/openai-service.ts`)

**Purpose:** Handle OpenAI API and iterative function calling
**Key Methods:**

- `executeIterativeLoop()` - Main session loop with iteration limits
- `buildToolsFromRequest()` - Convert Cubicler tools to OpenAI function schemas
- `processToolCalls()` - Execute MCP tool calls and handle responses
- `start()` - Initialize CubicAgent with callback handler

**Required Behavior:**

- Execute session loop with `DISPATCH_SESSION_MAX_ITERATION` limit
- Use CubicAgent.getTools() to fetch available Cubicler tools
- Convert Cubicler tools to OpenAI function schemas
- Maintain conversation context including tool calls/results
- Stop when OpenAI returns final response (no tool calls)
- Handle MCP retry through CubicAgentKit

### MessageBuilder (`src/utils/message-helper.ts`)

**Purpose:** Convert between Cubicler and OpenAI message formats
**Key Functions:**

- `buildOpenAIMessages()` - Convert AgentRequest.messages to OpenAI format
- `buildSystemMessage()` - Build system prompt with agent context and memory
- `cleanFinalResponse()` - Extract final response content

**Required Behavior:**

- Convert AgentRequest.messages to OpenAI format
- Include iteration context in system messages
- Preserve conversation including assistant tool_calls
- Clean final responses (remove agent name prefixes)
- Add memory context and usage instructions when available

### InternalToolAggregator (`src/core/internal-tool-aggregator.ts`)

**Purpose:** Manage internal memory tools alongside Cubicler MCP tools
**Key Features:**

- Aggregate internal memory tools with external MCP tools
- Handle tool execution routing (internal vs MCP)
- Memory tool implementations for persistent context

## 🔧 Session Iteration Pattern

1. **Initialize** - Set up iteration counter and context
2. **Get tools** - Fetch via CubicAgent.getTools() + internal tools
3. **OpenAI request** - Send with function definitions
4. **Tool execution** - Execute if OpenAI requests tools (MCP or internal)
5. **Iteration check** - Continue or return final response
6. **Cleanup** - Log metrics and token usage

## 💾 Memory Integration

**Memory Tools Available:**

- `agentmemory_remember` - Store information as sentences with tags
- `agentmemory_search` - Search for relevant past information
- `agentmemory_recall` - Recall specific memory by ID
- `agentmemory_get_short_term` - Get recent memories for context
- `agentmemory_forget` - Remove memories by ID
- `agentmemory_edit_content` - Update memory content
- `agentmemory_edit_importance` - Update importance scores (0-1)
- `agentmemory_add_tag` - Add tags to memories
- `agentmemory_remove_tag` - Remove tags from memories
- `agentmemory_replace_tags` - Replace all tags for a memory

**Memory Types:**

- `memory` - In-memory storage (development/testing)
- `sqlite` - Persistent SQLite storage (production)

## 🏗️ Project Structure

```text
src/
├── index.ts                     # Main entry point and exports
├── config/
│   ├── environment.ts           # Environment variable validation
│   └── types.ts                 # Configuration type definitions
├── core/
│   ├── openai-service.ts        # Main OpenAI service implementation
│   ├── openai-service-factory.ts # Service factory with environment loading
│   └── internal-tool-aggregator.ts # Internal tool management
├── internal-tools/             # Memory tool implementations
│   ├── internal-tool-handler.interface.ts
│   ├── internal-tool.interface.ts
│   └── memory/                 # Memory-specific tools
├── models/
│   └── types.ts                # OpenAI and service type definitions
└── utils/
    ├── message-helper.ts       # Message format conversion
    └── memory-helper.ts        # Memory utility functions
```

## 🧪 Testing Strategy

**Test Structure:**

- `tests/unit/` - Unit tests for individual components
- `tests/integration/` - Integration tests with OpenAI API
- `tests/setup.ts` - Test environment configuration

**Key Test Areas:**

- Environment variable validation
- Message format conversion
- Tool aggregation and execution
- OpenAI service integration
- Memory tool functionality

## ✅ Your Role as Claude

**MAINTAIN:**

- CubicAgentKit 2.3.1 patterns with lazy initialization
- Iterative function calling loop with tool building
- Message conversion and response cleaning
- 16 environment variables as specified
- Error handling and retry patterns
- Dual usage (standalone + library)
- Memory integration patterns
- SOLID principles and clean code standards

**UNDERSTAND:**

- This is both a deployable application AND npm library
- OpenAI service handles the main conversation loop
- CubicAgent provides MCP tool connectivity
- Memory tools are internal, MCP tools are external
- Session limits prevent infinite loops
- Lazy initialization reduces startup overhead

**DO NOT:**

- Add environment variables beyond the 16 specified
- Implement complex health checks or monitoring
- Add authentication middleware
- Over-engineer session management
- Add manual initialization code
- Implement streaming responses
- Violate SOLID principles or clean code standards
- Create monolithic functions or complex abstractions
- Ignore error handling or catch-and-ignore patterns

## 🔄 Development Workflow

**When Making Changes:**

1. Follow SOLID principles - single responsibility per class/method
2. Maintain clear separation between OpenAI, MCP, and memory concerns
3. Preserve the iterative function calling pattern
4. Update tests for any behavioral changes
5. Validate environment configuration changes
6. Ensure backward compatibility for library usage

**Error Handling Pattern:**

- Fail fast with meaningful error messages
- Let errors bubble up unless recoverable
- Log at appropriate levels with context
- Don't catch and ignore - only catch what you can handle

**Code Quality Standards:**

- Descriptive names for functions and variables
- Single responsibility per method
- Consistent TypeScript typing (avoid `any`)
- Clean imports and exports
- Self-documenting code with minimal comments
- Test edge cases and error conditions

---

This architecture enables both standalone deployment and library integration while maintaining clean separation of concerns and following established patterns from CubicAgentKit 2.3.1.
