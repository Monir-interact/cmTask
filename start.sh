#!/usr/bin/env sh
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
echo "Serving Kanban Workspace at http://localhost:$PORT"
( sleep 1; (command -v open >/dev/null && open "http://localhost:$PORT") || (command -v xdg-open >/dev/null && xdg-open "http://localhost:$PORT") ) >/dev/null 2>&1 &
if command -v python3 >/dev/null 2>&1; then python3 -m http.server "$PORT"
elif command -v npx >/dev/null 2>&1; then npx --yes serve -l "$PORT" .
else echo "Install Python 3 or Node.js, or just open index.html directly."; fi
