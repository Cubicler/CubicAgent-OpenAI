# Docker Deployment Guide

The CubicAgent-OpenAI service is available as a Docker image on Docker Hub: `cubicler/cubicagent-openai`

## Quick Start

### Pull and Run the Image

```bash
# Pull the latest image
docker pull cubicler/cubicagent-openai:latest

# Run with required environment variables
docker run -d \
  --name cubicagent-openai \
  -p 3000:3000 \
  -e OPENAI_API_KEY=your-openai-api-key \
  -e AGENT_NAME=MyAgent \
  cubicler/cubicagent-openai:latest
```

### Environment Variables

#### Required

- `OPENAI_API_KEY`: Your OpenAI API key

#### Optional (with defaults)

- `AGENT_PORT=3000`: Port the agent listens on
- `AGENT_NAME=CubicAgent-OpenAI`: Name of the agent
- `OPENAI_MODEL=gpt-4o`: OpenAI model to use
- `OPENAI_TEMPERATURE=1`: Temperature for OpenAI responses
- `OPENAI_SESSION_MAX_TOKENS=2048`: Maximum tokens per session
- `CUBICLER_URL=http://localhost:1503`: Cubicler orchestration URL
- `AGENT_TIMEOUT=10000`: Request timeout in milliseconds
- `AGENT_MAX_RETRIES=3`: Maximum retry attempts
- `AGENT_SESSION_MAX_ITERATION=10`: Maximum function calling iterations
- `LOG_LEVEL=info`: Logging level (error, warn, info, debug)

### Docker Compose Example

```yaml
version: '3.8'

services:
  cubicagent-openai:
    image: cubicler/cubicagent-openai:latest
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=your-openai-api-key
      - AGENT_NAME=ProductionAgent
      - OPENAI_MODEL=gpt-4o
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Health Check

The container includes a built-in health check that monitors the `/health` endpoint:

```bash
# Check if the service is healthy
curl http://localhost:3000/health
# Response: {"status":"ok","agent":"YourAgentName"}
```

### Available Tags

- `latest`: Latest stable version
- `1.0.1`: Specific version tag
- `1.0.0`: Previous version

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
        - name: AGENT_NAME
          value: "K8sAgent"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
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
docker run -p 3000:3000 -e OPENAI_API_KEY=your-key cubicagent-openai:local
```

### Multi-stage Build

The Dockerfile uses a multi-stage build approach:

1. Install all dependencies (including dev dependencies)
2. Build TypeScript to JavaScript
3. Remove dev dependencies to reduce image size
4. Create non-root user for security
5. Set up health checks

## Security

- The container runs as a non-root user (`cubicagent`)
- No sensitive data is included in the image
- Health checks are configured for monitoring
- All dependencies are installed from package-lock.json for consistency

## Support

For issues related to the Docker image, please check:

1. Environment variables are correctly set
2. OpenAI API key is valid
3. Network connectivity to OpenAI API
4. Container logs: `docker logs <container-name>`

For more information, visit the [GitHub repository](https://github.com/Cubicler/CubicAgent-OpenAI).
