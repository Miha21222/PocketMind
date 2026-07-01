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

# Full system tz database so Python's zoneinfo resolves every IANA name:
# tzdata provides canonical names (e.g. Europe/Kyiv) and tzdata-legacy the
# backward-compat aliases (e.g. Europe/Kiev) that Debian split out. Browsers'
# Intl returns either spelling depending on the runtime, so the backend must
# accept both or saving the timezone 422s. After the model bake to keep cache.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tzdata tzdata-legacy \
 && rm -rf /var/lib/apt/lists/*

COPY backend /app/backend

# Normalize line endings (in case the script was checked out with CRLF on Windows)
# and make the helper scripts executable.
RUN sed -i 's/\r$//' /app/backend/docker/entrypoint.sh \
 && sed -i 's/\r$//' /app/backend/docker/healthcheck.sh \
 && chmod +x /app/backend/docker/entrypoint.sh /app/backend/docker/healthcheck.sh

WORKDIR /app/backend

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
  CMD ["/app/backend/docker/healthcheck.sh"]

# Default command runs the whole backend (migrations + API + bot + scheduler).
# Passing an explicit command overrides this and runs it as-is.
ENTRYPOINT ["/app/backend/docker/entrypoint.sh"]
CMD ["all-in-one"]
