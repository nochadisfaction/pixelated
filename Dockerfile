# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.x
FROM node:${NODE_VERSION}-slim AS base

LABEL org.opencontainers.image.description="Astro"

# Install pnpm first (as root)
ARG PNPM_VERSION=10.11.0
RUN npm install -g pnpm@$PNPM_VERSION

# Install packages needed to build node modules (while still root)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential=12.* \
    node-gyp=* \
    pkg-config=* \
    python-is-python3=* \
    git=* \
    curl=* \
    ca-certificates=* && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Astro app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Create and fix permissions on /app directory
RUN mkdir -p /app && chown -R node:node /app

# Throw-away build stage to reduce size of final image
FROM base AS build

# Copy package files
COPY --chown=node:node package.json pnpm-lock.yaml ./

# Copy scripts directory first to ensure copy-polyfills.js is available
COPY --chown=node:node scripts ./scripts/

# Copy remaining application code
COPY --chown=node:node . .

# Build application
RUN pnpm install --frozen-lockfile --prod=false && \
    pnpm build && \
    pnpm prune --prod

# Final stage for app image
FROM base

# Add healthcheck (in the final stage)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4321/api/health || exit 1

# Switch to non-root user for the final image
USER node

# Copy built application
COPY --from=build --chown=node:node /app /app

# Make entrypoint script executable
RUN chmod +x /app/scripts/docker-entrypoint.js

# Entrypoint sets up the container
ENTRYPOINT ["/app/scripts/docker-entrypoint.js"]

# Start the server by default
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
