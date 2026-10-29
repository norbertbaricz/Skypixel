#!/bin/sh
# Easy-to-tune launcher settings. Application settings stay in .env.
set -eu
NODE_EXECUTABLE="${SKYPIXEL_NODE_BIN:-node}"
PROJECT_DIRECTORY="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"

cd -- "$PROJECT_DIRECTORY"
if ! command -v "$NODE_EXECUTABLE" >/dev/null 2>&1; then
    printf '%s\n' '[Skypixel] Node.js 22.13.0 or newer is required. Install Node.js with npm, then run start.sh again.' >&2
    exit 127
fi

if [ "${1:-}" = '--check' ]; then
    exec "$NODE_EXECUTABLE" "$PROJECT_DIRECTORY/scripts/prepare-start.cjs" --check
fi

"$NODE_EXECUTABLE" "$PROJECT_DIRECTORY/scripts/prepare-start.cjs"
printf '%s\n' '[Skypixel] Starting the Express server. Press Ctrl+C to stop.'
# Replace the shell so VPS shutdown signals reach the server directly.
exec "$NODE_EXECUTABLE" "$PROJECT_DIRECTORY/app.js" "$@"
