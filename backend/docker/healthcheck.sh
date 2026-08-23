#!/usr/bin/env sh
set -eu

python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/ready', timeout=5).read()"

status="$(supervisorctl -c /app/backend/docker/supervisord.conf status)"
printf '%s\n' "$status" | grep -Eq '^(app:)?api[[:space:]]+RUNNING'
printf '%s\n' "$status" | grep -Eq '^(app:)?bot[[:space:]]+RUNNING'
printf '%s\n' "$status" | grep -Eq '^(app:)?scheduler[[:space:]]+RUNNING'
