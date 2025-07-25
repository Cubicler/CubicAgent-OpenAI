# CubicAgent-OpenAI 🤖

A deployable OpenAI agent service that integrates with the [Cubicler AI Orchestration Framework](https://github.com/hainayanda/Cubicler) using the [`@cubicler/cubicagentkit`](https://www.npmjs.com/package/@cubicler/cubicagentkit) SDK.

## 🎯 Overview

This service acts as a standalone agent that:

- ✅ Receives requests via the `/call` endpoint (handled by the SDK)
- ✅ Converts Cubicler messages to OpenAI Chat API format
- ✅ Queries OpenAI GPT models for AI responses
- ✅ Returns responses through the Cubicler framework
- ✅ Provides health checks via `/health` endpoint

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key
- Running Cubicler orchestration service (optional for testing)

### Installation

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
AGENT_PORT=3000
AGENT_NAME=CubicAgent-OpenAI
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o
AGENT_TEMPERATURE=1
OPENAI_SESSION_MAX_TOKENS=2048
CUBICLER_URL=http://localhost:1503
AGENT_TIMEOUT=10000
AGENT_MAX_RETRIES=3
AGENT_SESSION_MAX_ITERATION=10
```

### Running the Service

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The service will be available at `http://localhost:3000` with the following endpoints:

- `POST /call` - Agent processing endpoint (used by Cubicler)
- `GET /health` - Health check endpoint

## 🐳 Docker Deployment

### Build and Run

```bash
# Build the Docker image
docker build -t cubicagent-openai .

# Run the container
docker run -p 3000:3000 --env-file .env cubicagent-openai
```

### Docker Compose

The project includes a `docker-compose.yml` file for easy deployment:

```bash
# Using environment file
docker-compose --env-file .env up --build

# Or with inline environment variables
OPENAI_API_KEY=your-api-key docker-compose up --build
```

Example `docker-compose.yml`:

```yaml
services:
  cubicagent-openai:
    build: .
    ports:
      - "${AGENT_PORT:-3000}:${AGENT_PORT:-3000}"
    environment:
      - AGENT_PORT=${AGENT_PORT:-3000}
      - AGENT_NAME=${AGENT_NAME:-CubicAgent-OpenAI}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o}
      - AGENT_TEMPERATURE=${AGENT_TEMPERATURE:-1}
      - OPENAI_SESSION_MAX_TOKENS=${OPENAI_SESSION_MAX_TOKENS:-2048}
      - CUBICLER_URL=${CUBICLER_URL:-http://localhost:1503}
      - AGENT_TIMEOUT=${AGENT_TIMEOUT:-10000}
      - AGENT_MAX_RETRIES=${AGENT_MAX_RETRIES:-3}
      - AGENT_SESSION_MAX_ITERATION=${AGENT_SESSION_MAX_ITERATION:-10}
      - LOG_LEVEL=${LOG_LEVEL:-info}
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

### Request Format (sent by Cubicler)

```typescript
interface AgentRequest {
  prompt: string;           // System prompt/context
  messages: Message[];      // Conversation history
  providers: Provider[];    // Available providers (unused)
}

interface Message {
  role: string;            // Message sender role
  content: string;         // Message content
}
```

### Response Format

The agent returns a simple string response containing the AI-generated message.

### Message Role Conversion

The service converts Cubicler message roles to OpenAI format:

- `"user"` → `"user"` (unchanged)
- `"{agentName}"` → `"assistant"` (agent responses)
- `"OtherAgent"` → `"user"` with context: `"[OtherAgent]: message"`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
cubicagent-openai/
├── src/
│   ├── index.ts                  # Main entry point and agent setup
│   ├── openai-cubicagent.ts      # OpenAI Cubic Agent class
│   └── utils/
│       ├── env-helper.ts         # Environment configuration helper
│       └── openai-helper.ts      # OpenAI utility functions
├── tests/
│   ├── setup.ts                  # Test configuration
│   ├── index.test.ts             # Setup and initialization tests
│   ├── openai-cubicagent.test.ts # OpenAI agent logic tests
│   └── utils/
│       ├── env-helper.test.ts    # Environment helper tests
│       └── openai-helper.test.ts # OpenAI helper tests
├── .env.example                  # Environment template
├── .dockerignore                 # Docker ignore rules
├── Dockerfile                    # Container configuration
├── jest.config.js                # Jest test configuration
├── package.json                  # NPM package config
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## 🛠️ Development

### Key Components

- **OpenAICubicAgent**: Main agent class that encapsulates CubicAgent with OpenAI integration
- **startAgent()**: Setup function that initializes the agent from environment variables
- **Message Conversion**: Handles role mapping between Cubicler and OpenAI formats
- **Environment Helper**: Validates and processes environment variables
- **OpenAI Helper**: Utility functions for OpenAI API integration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AGENT_PORT` | No | `3000` | Server port |
| `AGENT_NAME` | No | `CubicAgent-OpenAI` | Agent identifier |
| `OPENAI_API_KEY` | **Yes** | - | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model to use |
| `AGENT_TEMPERATURE` | No | `1` | Response creativity (0-2) |
| `OPENAI_SESSION_MAX_TOKENS` | No | `2048` | Maximum response length |
| `CUBICLER_URL` | No | `http://localhost:1503` | Cubicler service URL |
| `AGENT_TIMEOUT` | No | `10000` | Cubicler client timeout (ms) |
| `AGENT_MAX_RETRIES` | No | `3` | Maximum retry attempts |
| `AGENT_SESSION_MAX_ITERATION` | No | `10` | Maximum function call iterations |

### Error Handling

The service handles common error scenarios:

- ❌ Missing OpenAI API key
- ❌ OpenAI API failures (rate limits, network issues)
- ❌ Empty responses from OpenAI
- ❌ Invalid request formats

All errors are thrown with descriptive messages and logged for debugging.

## 🤝 Integration with Cubicler

This agent is designed to work with the Cubicler AI Orchestration Framework:

1. **Registration**: The agent registers itself with the Cubicler service
2. **Request Handling**: Cubicler sends requests to the `/call` endpoint
3. **Response**: The agent processes the request and returns an AI response
4. **Health Checks**: Cubicler monitors agent health via `/health`

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [Cubicler](https://github.com/hainayanda/Cubicler) - AI Orchestration Framework
- [@cubicler/cubicagentkit](https://www.npmjs.com/package/@cubicler/cubicagentkit) - Agent SDK

## 🐛 Troubleshooting

### Common Issues

**Agent won't start:**

- Check that `OPENAI_API_KEY` is set correctly
- Ensure port 3000 (or configured port) is available
- Verify Node.js version is 18+

**OpenAI API errors:**

- Verify API key has sufficient credits
- Check rate limits and quotas
- Ensure the specified model is available

**Connection to Cubicler fails:**

- Verify `CUBICLER_URL` points to running Cubicler service
- Check network connectivity
- Review Cubicler service logs
