#!/usr/bin/env bash
# Entrypoint for the persona runner container.
#
# Env:
#   PERSONA           persona id to run (default: hoodintel)
#   X_AUTH_TOKEN      X session cookie (required)
#   ANTHROPIC_API_KEY required for LLM content generation
set -euo pipefail

PERSONA="${PERSONA:-hoodintel}"

echo "runner starting — persona=${PERSONA}"

if [[ -z "${X_AUTH_TOKEN:-}" ]]; then
  echo "FATAL: X_AUTH_TOKEN is not set" >&2
  exit 1
fi

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "FATAL: ANTHROPIC_API_KEY is required for content generation" >&2
  exit 1
fi

# Run headed under a virtual display — X serves a bot interstitial to headless
# Chromium, which breaks cookie auth. xvfb-run provides the display.
exec xvfb-run -a --server-args="-screen 0 1280x800x24" \
  npx tsx examples/x-automation/persona-runner.ts --persona "$PERSONA"
