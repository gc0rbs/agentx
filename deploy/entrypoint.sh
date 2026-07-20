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

exec npx tsx examples/x-automation/persona-runner.ts --persona "$PERSONA"
