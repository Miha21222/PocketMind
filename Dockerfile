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

# Bake the faster-whisper STT model into the image so the container stays
# self-contained (no model download at runtime on the host). Use "small" for
# better Russian accuracy at the cost of size/CPU: --build-arg WHISPER_MODEL=small
ARG WHISPER_MODEL=base
ENV WHISPER_MODEL=${WHISPER_MODEL}
ENV WHISPER_DOWNLOAD_ROOT=/app/models
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('${WHISPER_MODEL}', device='cpu', compute_type='int8', download_root='/app/models')"

# Refresh the system tz database so Python's zoneinfo resolves modern IANA
# names (e.g. Europe/Kyiv, not just legacy Europe/Kiev). python:*-slim ships
# an outdated copy, which made saving such timezones 422. Placed after the
# model bake so that expensive layer stays cached on rebuilds.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tzdata \
 && rm -rf /var/lib/apt/lists/*

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
