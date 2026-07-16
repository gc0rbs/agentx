# Mizukara / persona runner — container image for Railway or any Docker host.
# Playwright base image ships Chromium + system deps at the version we pin to.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /app

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

# RUN_MODE selects what the container runs (see entrypoint.sh):
#   arc      → the scripted mizukara launch sequence (default)
#   persona  → ongoing persona behavior (topic rotation + mention replies)
ENV RUN_MODE=arc

ENTRYPOINT ["bash", "deploy/entrypoint.sh"]
