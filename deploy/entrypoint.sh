#!/usr/bin/env bash
# Entrypoint for the persona/campaign runner container.
#
# Env:
#   RUN_MODE          arc | persona   (default: arc)
#   PERSONA           persona id for persona mode (default: mizukara)
#   ARC_START_AT      optional relative (+10m/+2h) or ISO datetime anchor for arc
#                      generation; takes precedence over ARC_START_DATE
#   ARC_START_DATE    optional YYYY-MM-DD for arc generation (default: tomorrow)
#   X_AUTH_TOKEN      X session cookie (required)
#   ANTHROPIC_API_KEY required for persona mode (LLM generation); arc mode does not need it
set -euo pipefail

MODE="${RUN_MODE:-arc}"
PERSONA="${PERSONA:-mizukara}"

echo "runner starting — mode=${MODE} persona=${PERSONA}"

if [[ -z "${X_AUTH_TOKEN:-}" ]]; then
  echo "FATAL: X_AUTH_TOKEN is not set" >&2
  exit 1
fi

case "$MODE" in
  arc)
    # Generate the scripted arc if it isn't already on the persisted volume.
    if [[ ! -f ./data/mizukara-launch.json ]]; then
      START="${ARC_START_AT:-${ARC_START_DATE:-}}"
      echo "generating arc (start=${START:-tomorrow})..."
      npx tsx examples/x-automation/generate-mizukara-launch.ts "$START"
    else
      echo "arc file already present on volume, reusing it"
    fi
    # Continuous campaign runner: posts each entry at its scheduled time, collects analytics.
    exec npx tsx examples/x-automation/run-campaign.ts ./data/mizukara-launch.json
    ;;
  persona)
    if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
      echo "FATAL: ANTHROPIC_API_KEY is required for persona mode" >&2
      exit 1
    fi
    exec npx tsx examples/x-automation/persona-runner.ts --persona "$PERSONA"
    ;;
  *)
    echo "FATAL: unknown RUN_MODE '$MODE' (expected: arc | persona)" >&2
    exit 1
    ;;
esac
