#!/usr/bin/env sh
set -eu

python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5).read()"

status="$(supervisorctl -c /app/backend/docker/supervisord.conf status)"
printf '%s\n' "$status" | grep -Eq '^api[[:space:]]+RUNNING'
printf '%s\n' "$status" | grep -Eq '^bot[[:space:]]+RUNNING'
printf '%s\n' "$status" | grep -Eq '^scheduler[[:space:]]+RUNNING'
