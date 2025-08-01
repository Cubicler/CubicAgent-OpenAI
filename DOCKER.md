# Docker Deployment Guide

The CubicAgent-OpenAI service is available as a Docker image on Docker Hub: `cubicler/cubicagent-openai`

## Published Docker Images

- **Latest**: `cubicler/cubicagent-openai:latest`  
- **Version 2.1.0**: `cubicler/cubicagent-openai:2.1.0`

## Quick Start

### Pull and Run the Image

```bash
# Pull the latest image
docker pull cubicler/cubicagent-openai:latest

# Run with required environment variables
docker run -d \
  --name cubicagent-openai \
  -p 1504:1504 \
  -e OPENAI_API_KEY=your-openai-api-key \
  -e CUBICLER_URL=http://host.docker.internal:1503 \
  -e AGENT_PORT=1504 \
  -e OPENAI_MODEL=gpt-4o-mini \
  cubicler/cubicagent-openai:2.1.0
```

### Environment Variables

#### Required

- `OPENAI_API_KEY`: Your OpenAI API key
- `CUBICLER_URL`: URL to your Cubicler instance

#### Optional (with defaults)

- `OPENAI_MODEL=gpt-4o`: OpenAI model to use (gpt-4o, gpt-4, gpt-4-turbo, gpt-3.5-turbo)
- `OPENAI_TEMPERATURE=0.7`: Response randomness (0.0-2.0)
- `OPENAI_SESSION_MAX_TOKENS=4096`: Maximum tokens per session/response
- `OPENAI_ORG_ID`: OpenAI organization ID (optional)
- `OPENAI_PROJECT_ID`: OpenAI project ID (optional)
- `OPENAI_BASE_URL`: Custom OpenAI API base URL (optional)
- `OPENAI_TIMEOUT=600000`: OpenAI API timeout in milliseconds
- `OPENAI_MAX_RETRIES=2`: Maximum OpenAI API retry attempts
- `AGENT_PORT=3000`: Port the agent server listens on
- `DISPATCH_TIMEOUT=30000`: Overall request timeout in milliseconds
- `MCP_MAX_RETRIES=3`: Maximum MCP communication retry attempts
- `MCP_CALL_TIMEOUT=10000`: Individual MCP call timeout in milliseconds
- `DISPATCH_SESSION_MAX_ITERATION=10`: Maximum conversation iterations per session
- `DISPATCH_ENDPOINT=/`: Agent endpoint path

### Docker Compose Example

```yaml
services:
  cubicagent-openai:
    image: cubicler/cubicagent-openai:2.1.0
    ports:
      - "1504:1504"
    environment:
      # Required
      - OPENAI_API_KEY=your-openai-api-key
      - CUBICLER_URL=http://host.docker.internal:1503
      
      # Optional (with defaults)
      - OPENAI_MODEL=gpt-4o
      - OPENAI_TEMPERATURE=0.7
      - OPENAI_SESSION_MAX_TOKENS=4000
      - AGENT_PORT=1504
      - DISPATCH_SESSION_MAX_ITERATION=10
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "sh", "-c", "curl -f http://localhost:${AGENT_PORT:-3000}/ || nc -z localhost ${AGENT_PORT:-3000}"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Using Environment File

Create a `.env` file:

```env
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.7
OPENAI_SESSION_MAX_TOKENS=4000
CUBICLER_URL=http://host.docker.internal:1503
AGENT_PORT=1504
DISPATCH_SESSION_MAX_ITERATION=10
```

Then run:

```bash
docker run -d \
  --name cubicagent-openai \
  -p 1504:1504 \
  --env-file .env \
  cubicler/cubicagent-openai:2.1.0
```

### Health Check

The container includes built-in health checks. Check container health:

```bash
# Check container status
docker ps

# Inspect health status  
docker inspect cubicagent-openai

# View logs
docker logs cubicagent-openai
docker logs -f cubicagent-openai  # Follow logs
```

### Available Tags

- `latest`: Latest stable version (currently 2.1.0)
- `2.1.0`: Latest version with CubicAgentKit 2.1.0 support

### Using with Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cubicagent-openai
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cubicagent-openai
  template:
    metadata:
      labels:
        app: cubicagent-openai
    spec:
      containers:
      - name: cubicagent-openai
        image: cubicler/cubicagent-openai:latest
        ports:
        - containerPort: 3000
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-secret
              key: api-key
        - name: CUBICLER_URL
          value: "http://cubicler-service:1503"
        - name: AGENT_PORT
          value: "3000"
        - name: OPENAI_MODEL
          value: "gpt-4o"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: cubicagent-openai-service
spec:
  selector:
    app: cubicagent-openai
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

## Development

### Building Locally

```bash
# Clone the repository
git clone https://github.com/Cubicler/CubicAgent-OpenAI.git
cd CubicAgent-OpenAI

# Build the image
docker build -t cubicagent-openai:local .

# Run locally built image
docker run -p 1504:1504 \
  -e OPENAI_API_KEY=your-key \
  -e CUBICLER_URL=http://host.docker.internal:1503 \
  -e AGENT_PORT=1504 \
  cubicagent-openai:local
```

### Multi-stage Build

The Dockerfile uses a multi-stage build approach:

1. Install all dependencies (including dev dependencies)
2. Build TypeScript to JavaScript
3. Remove dev dependencies to reduce image size
4. Create non-root user for security
5. Set up health checks

## Security

- **Never commit `.env` files** with API keys to version control
- Use Docker secrets or environment variable injection in production  
- The container runs as a non-root user (`cubicagent`, UID 1001) for security
- No sensitive data is included in the image
- Health checks are configured for monitoring
- All dependencies are installed from package-lock.json for consistency

## Networking

- Use `host.docker.internal` to access host services from container
- For container-to-container communication, use container names or Docker networks
- Ensure Cubicler is accessible from the container network
- Default port is 3000, but configurable via `AGENT_PORT` environment variable

## Support

For issues related to the Docker image, please check:

1. Environment variables are correctly set (especially `OPENAI_API_KEY` and `CUBICLER_URL`)
2. OpenAI API key is valid and has sufficient credits
3. Network connectivity to OpenAI API and Cubicler instance
4. Container logs: `docker logs <container-name>`
5. Container health: `docker inspect <container-name>`

Common issues:

- **Connection refused**: Check if Cubicler is running and accessible at `CUBICLER_URL`
- **OpenAI API errors**: Verify API key and check OpenAI service status
- **Port conflicts**: Ensure the port specified in `AGENT_PORT` is available

For more information, visit the [GitHub repository](https://github.com/Cubicler/CubicAgent-OpenAI).
