# Claims Frontend - Production Docker Image
# Builds React/Vite app and serves via Node.js static server

FROM edgeinternal1uhg.optum.com/glb-docker-uhg-loc/uhg-goldenimages/node:24-latest-dev

ARG NPM_TOKEN

# Optum Artifactory NPM Registry Configuration
ENV NPM_CONFIG_REGISTRY=https://edgeinternal1uhg.optum.com/artifactory/api/npm/a11ydashboard-npm-vir/ \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=6000000 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=100000 \
    NPM_CONFIG_LEGACY_PEER_DEPS=true \
    NPM_CONFIG_FUND=false \
    NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Setup non-root user with app directory
USER root
RUN mkdir -p /app && chown -R node:node /app
USER node
WORKDIR /app

# Configure NPM authentication for Optum Artifactory
RUN printf '%s\n' \
    'registry=https://edgeinternal1uhg.optum.com/artifactory/api/npm/a11ydashboard-npm-vir/' \
    "//edgeinternal1uhg.optum.com/artifactory/api/npm/a11ydashboard-npm-vir/:_authToken=${NPM_TOKEN}" \
    'always-auth=false' \
    > "$HOME/.npmrc"

# Copy dependency files
COPY --chown=node:node package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
# Use npm install to regenerate lock file for target platform (linux/amd64)
# npm ci would fail if platform-specific binaries are missing from lock file
RUN npm install --include=dev

# Copy application source code
COPY --chown=node:node . .

# Build the application
# Runs: TypeScript compilation + Vite build + copy server runtime files to dist/
RUN npm run build

# Expose port for container networking
EXPOSE 3000

# Runtime environment variables (can be overridden at container start)
# The app reads these from process.env and serves them via GET /config.js
# Examples:
#   AUTH_API_BASE_URL="https://api-backend.optum.com"
#   AGENTIC_API_BASE_URL="https://agentic-service.optum.com"
#   CLIENT_NAME="Optum Claims Dashboard"

# Start the application
# Runs: node dist/server-dist.mjs (SPA server with runtime config endpoint)
ENTRYPOINT []
CMD ["npm", "run", "start"]
