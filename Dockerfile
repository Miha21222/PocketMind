FROM python:3.12-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Default to the persistent SQLite path inside the container; override via
# DATABASE_URL (e.g. a managed Postgres) for hosted deployments.
ENV DATABASE_URL=sqlite+aiosqlite:////app/data/pocketmind.db

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
 && pip install --no-cache-dir supervisor

COPY backend /app/backend

# Normalize line endings (in case the script was checked out with CRLF on Windows)
# and make the entrypoint executable.
RUN sed -i 's/\r$//' /app/backend/docker/entrypoint.sh \
 && chmod +x /app/backend/docker/entrypoint.sh

WORKDIR /app/backend

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health').read()" || exit 1

# Default command runs the whole backend (migrations + API + bot + scheduler).
# Passing an explicit command overrides this and runs it as-is.
ENTRYPOINT ["/app/backend/docker/entrypoint.sh"]
CMD ["all-in-one"]
