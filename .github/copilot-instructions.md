# GitHub Copilot Instructions for CubicAgent-OpenAI

You are assisting with the development of a **production-ready OpenAI agent service** called `cubicagent-openai` that integrates with the Cubicler AI Orchestration Framework using the `@cubicler/cubicagentkit` SDK.

**PROJECT STATUS: COMPLETE & PRODUCTION-READY** ✅
- 66 comprehensive tests (100% pass rate)
- Full TypeScript ES2022 implementation
- Complete Docker containerization
- Production-grade error handling & logging
- Comprehensive documentation

For more context, refer to [CubicAgentKit](https://www.npmjs.com/package/@cubicler/cubicagentkit)

## Project Context

This is a **fully implemented agent service** that:
- Uses the `CubicAgent` class from `@cubicler/cubicagentkit` for standalone server mode
- Integrates with OpenAI's Chat Completion API with function calling support
- Handles Model Context Protocol (MCP) server integration
- Provides `/call` and `/health` endpoints
- Returns AI-generated responses through the Cubicler framework
- Supports dynamic provider loading and function execution

## Key SDK Information & Current Implementation

### Current Architecture Overview

The project uses a layered architecture:
- **`src/index.ts`**: Entry point with graceful startup/shutdown
- **`src/openai-cubicagent.ts`**: Core agent logic with OpenAI integration
- **`src/utils/env-helper.ts`**: Environment configuration management
- **`src/utils/openai-helper.ts`**: OpenAI API utilities and message formatting

### CubicAgent Usage Pattern (Current Implementation)

```typescript
import { CubicAgent, CubiclerClient } from '@cubicler/cubicagentkit';
import { OpenAICubicAgent } from './openai-cubicagent.js';
import { createConfigFromEnv } from './utils/env-helper.js';

const config = createConfigFromEnv();
const cubiclerClient = new CubiclerClient(
  config.cubiclerUrl,
  config.agentTimeout,
  config.agentMaxRetries
);

const openaiAgent = new OpenAICubicAgent(config, cubiclerClient);
const agent = new CubicAgent({
  port: config.agentPort,
  agentName: config.agentName,
  logLevel: config.logLevel,
  cubiclerClient: cubiclerClient
});

agent.onCall(async (request, context) => {
  return await openaiAgent.handleCall(request, context);
});
```

### Request/Response Contract

- **AgentRequest**: `{ prompt: string, providers: Provider[], messages: Message[] }`
- **AgentResponse**: Return a `string` message from the `onCall` handler
- **Function Calling**: Supports OpenAI function calling with MCP provider integration
- **Provider Loading**: Dynamic loading of MCP server specifications
- **Context Management**: Maintains conversation context across function calls

## Required Environment Variables

```env
# Required
OPENAI_API_KEY=your-openai-api-key

# Optional with defaults
AGENT_PORT=3000
AGENT_NAME=CubicAgent-OpenAI
OPENAI_MODEL=gpt-4o
AGENT_TEMPERATURE=1
OPENAI_SESSION_MAX_TOKENS=2048
CUBICLER_URL=http://localhost:1503
AGENT_TIMEOUT=10000
AGENT_MAX_RETRIES=3
AGENT_SESSION_MAX_ITERATION=10
LOG_LEVEL=info
```

## Project Structure

```
cubicagent-openai/
├── src/
│   ├── index.ts                    # Entry point with graceful startup/shutdown
│   ├── openai-cubicagent.ts       # Core OpenAI agent implementation
│   └── utils/
│       ├── env-helper.ts          # Environment configuration management
│       └── openai-helper.ts       # OpenAI API utilities
├── tests/
│   ├── index.test.ts              # Entry point tests (16 tests)
│   ├── openai-cubicagent.test.ts  # Core agent tests (34 tests)
│   └── utils/
│       ├── env-helper.test.ts     # Environment helper tests (15 tests)
│       └── openai-helper.test.ts  # OpenAI helper tests (1 test)
├── .env.example                   # Example environment variables
├── .gitignore                     # Git ignore patterns
├── .dockerignore                  # Docker ignore patterns
├── Dockerfile                     # Production Docker container
├── docker-compose.yml             # Development Docker setup
├── package.json                   # NPM configuration & scripts
├── tsconfig.json                  # TypeScript ES2022 configuration
├── jest.config.js                 # Jest testing configuration
├── LICENSE                        # MIT License
└── README.md                      # Comprehensive documentation
```

## Implementation Guidelines

### Main Logic (src/index.ts)

- Import `CubicAgent` and `CubiclerClient` from `@cubicler/cubicagentkit`
- Import `OpenAICubicAgent` from `./openai-cubicagent.js`
- Create configuration using `createConfigFromEnv()` helper
- Create CubiclerClient with environment-based configuration
- Create CubicAgent with proper configuration
- Implement `onCall` handler that delegates to `OpenAICubicAgent.handleCall()`

### Core Agent Logic (src/openai-cubicagent.ts)

- Handles OpenAI Chat Completion API integration
- Implements function calling loop with iteration limits
- Manages MCP provider loading and function execution
- Provides comprehensive error handling and logging
- Supports conversation context management

### Environment Configuration (src/utils/env-helper.ts)

- Validates required environment variables
- Provides type-safe configuration interface
- Handles numeric parsing with proper defaults
- Supports all configurable agent parameters

### Message Conversion Pattern

```typescript
// Current implementation in src/utils/openai-helper.ts
export function convertToOpenAIMessages(
  prompt: string, 
  messages: Message[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  
  if (prompt.trim()) {
    openaiMessages.push({ role: 'system', content: prompt });
  }
  
  messages.forEach(message => {
    openaiMessages.push({
      role: message.role as 'user' | 'assistant' | 'system',
      content: message.content
    });
  });
  
  return openaiMessages;
}
```

### Dependencies to Include

- `@cubicler/cubicagentkit` - Core SDK
- `openai` - OpenAI API client
- `dotenv` - Environment variable loading
- TypeScript and Jest for testing
- Complete package.json with all dev dependencies

## What NOT to do

- Don't create Express routes manually (SDK handles this)
- Don't implement the `/call` or `/health` endpoints (SDK provides them)
- Don't modify the SDK or reimplement its functionality
- Don't add frontend code or UI components
- Don't implement multiple AI providers (OpenAI only)

## Docker Considerations

- Use Node.js base image
- Install dependencies with npm
- Copy source code and build TypeScript
- Expose the PORT environment variable
- Run `npm start` as the container command

## Testing Approach

- The SDK supports dependency injection for testing
- Mock the `CubiclerClient` for unit tests
- Mock the OpenAI client for testing AI integration
- Test the `onCall` handler logic independently

## Production Features

### Error Handling & Logging
- Comprehensive error handling for OpenAI API failures
- Graceful handling of invalid function call JSON
- Proper error propagation with meaningful messages
- Structured logging throughout the application

### Function Calling Support
- Dynamic MCP provider loading via `getProviderSpec` function
- Support for multi-step function calling workflows
- Iteration limits to prevent infinite loops (`AGENT_SESSION_MAX_ITERATION`)
- Context preservation across function calls

### Performance & Reliability
- Connection pooling for HTTP requests
- Graceful startup and shutdown procedures
- Health check endpoints for monitoring
- Configurable timeouts and retry logic

When suggesting code or making changes, prioritize:
1. **Correct SDK usage** - Follow the documented patterns exactly
2. **Environment configuration** - Use env vars for all configurable values
3. **Error handling** - Handle OpenAI API errors gracefully
4. **Type safety** - Leverage TypeScript types from the SDK
5. **Clean architecture** - Keep the implementation focused and modular
