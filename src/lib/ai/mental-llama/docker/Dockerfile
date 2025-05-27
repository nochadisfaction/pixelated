FROM node:18-alpine AS base

# Add build arguments for better caching
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Create app directory
WORKDIR /app

# Copy package files for better caching
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile --prod=false

# Copy application code
COPY . .

# Build the application
RUN pnpm build

# Production dependencies installation
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile --prod

# Production image with minimal dependencies
FROM node:18-alpine AS production

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mentalllama -u 1001 -G nodejs

# Set working directory and permissions
WORKDIR /app
RUN chown -R mentalllama:nodejs /app

# Copy built application from base stage
COPY --from=base --chown=mentalllama:nodejs /app/dist ./dist
COPY --from=deps --chown=mentalllama:nodejs /app/node_modules ./node_modules
COPY --chown=mentalllama:nodejs package.json ./

# Set environment variables with defaults
ENV NODE_ENV=production
ENV EMOTION_LLAMA_API_URL=""
ENV EMOTION_LLAMA_API_KEY=""
ENV FHE_KEY_PATH="/app/certs/fhe.key"
ENV FHE_CERT_PATH="/app/certs/fhe.cert"

# MentalLLaMA 7B model configuration
ENV USE_MENTAL_LLAMA_7B_MODEL="false"
ENV MENTAL_LLAMA_7B_API_URL=""
ENV MENTAL_LLAMA_7B_API_KEY=""
ENV MENTAL_LLAMA_7B_MODEL_NAME="MentalLLaMA-chat-7B"

# MentalLLaMA 13B model configuration
ENV USE_MENTAL_LLAMA_13B_MODEL="false"
ENV MENTAL_LLAMA_13B_API_URL=""
ENV MENTAL_LLAMA_13B_API_KEY=""
ENV MENTAL_LLAMA_13B_MODEL_NAME="MentalLLaMA-chat-13B"

# Create directory for certificates with proper permissions
RUN mkdir -p /app/certs && chown -R mentalllama:nodejs /app/certs

# Create healthcheck script
RUN echo '#!/bin/sh\ncurl -f http://localhost:3000/api/ai/mental-health/status || exit 1' > /app/healthcheck.sh && \
    chmod +x /app/healthcheck.sh && \
    chown mentalllama:nodejs /app/healthcheck.sh

# Set healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD [ "/app/healthcheck.sh" ]

# Expose port
EXPOSE 3000

# Switch to non-root user
USER mentalllama

# Start the server
CMD ["node", "dist/server.js"]
