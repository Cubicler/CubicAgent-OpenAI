# Use Node.js 20 LTS Alpine base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S cubicagent -u 1001

# Change ownership of the app directory
RUN chown -R cubicagent:nodejs /app
USER cubicagent

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${AGENT_PORT:-3000}/health || exit 1

# Start the application
CMD ["npm", "start"]
