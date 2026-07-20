# Persona runner — container image for Railway or any Docker host.
# Playwright base image ships Chromium + system deps at the version we pin to.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /app

# Xvfb lets us run Chromium headed (X flags headless and serves a bot page).
# curl is used for network diagnostics in entrypoint.sh.
RUN apt-get update && apt-get install -y --no-install-recommends xvfb curl \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# tsx runs the TypeScript entrypoints directly
RUN npm install --no-save tsx

# App source
COPY . .

# Persisted at runtime via a mounted volume (session cookie + campaign state)
RUN mkdir -p /app/data
ENV NODE_ENV=production

# PERSONA selects which persona the runner drives (see entrypoint.sh)
ENV PERSONA=hoodintel

ENTRYPOINT ["bash", "deploy/entrypoint.sh"]
