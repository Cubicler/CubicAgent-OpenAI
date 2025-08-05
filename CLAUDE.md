# CubicAgent-OpenAI Development Guide

OpenAI agent application + npm library integrating GPT models with Cubicler 2.3.0 via CubicAgentKit 2.3.1.

## Core Architecture

**Stack:** CubicAgentKit 2.3.1 + OpenAI + Memory Integration

- CubicAgent: Main orchestrator (lazy init)
- OpenAI Service: Iterative function calling
- Memory: SQLite/in-memory with 10 agent tools
- Transport: HTTP/stdio modes

## Environment Variables (16 total)

**Required:** `OPENAI_API_KEY`

**Key Config:**

- `TRANSPORT_MODE` (http/stdio), `CUBICLER_URL`
- `OPENAI_MODEL` (gpt-4o default), `OPENAI_TEMPERATURE` (0.7)
- `DISPATCH_SESSION_MAX_ITERATION` (10), `AGENT_PORT` (3000)
- `MEMORY_ENABLED` (false), `MEMORY_TYPE` (memory/sqlite)

## Core Services

**OpenAIService** (`src/core/openai-service.ts`):

- `executeIterativeLoop()`: Session loop with iteration limits
- `buildOpenAITools()`: Convert Cubicler→OpenAI function schemas
- `executeToolCalls()`: Execute MCP/internal tools
- Stops when no tool calls returned

**MessageHelper** (`src/utils/message-helper.ts`):

- `buildOpenAIMessages()`: Cubicler→OpenAI format
- `buildSystemMessage()`: System prompt + memory context
- `cleanFinalResponse()`: Extract final content

**InternalToolAggregator** (`src/core/internal-tool-aggregator.ts`):

- Routes internal memory tools vs external MCP tools

## Session Flow

1. Initialize iteration counter
2. Get tools (CubicAgent.getTools() + memory tools)  
3. OpenAI request with functions
4. Execute tool calls if requested
5. Check iteration limit → continue or return
6. Log metrics

## Memory Tools (10 available)

`agentmemory_remember|search|recall|get_short_term|forget|edit_content|edit_importance|add_tag|remove_tag|replace_tags`

Implementation in `src/internal-tools/memory/` extending `BaseMemoryTool`.

## Key Constraints

**MAINTAIN:**

- CubicAgentKit 2.3.1 patterns
- 16 env vars limit
- SOLID principles
- Dual usage (app + library)

**AVOID:**

- Additional env variables
- Complex middleware
- Manual initialization
- Streaming responses
- Monolithic functions

## Commands

- `npm run dev|build|start|lint|test`
- `npm run test:integration` (requires OPENAI_API_KEY)

Package: `@cubicler/cubicagent-openai` v2.3.1
