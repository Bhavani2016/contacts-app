# --- Build stage: install deps (kept separate so dev deps / build caches don't bloat runtime) ---
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# --- Runtime stage ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Run as non-root for defense in depth.
RUN useradd --create-home --shell /bin/false appuser

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Default to the bundled SQLite driver so the image runs standalone with
# zero external dependencies. Override DB_DRIVER/DATABASE_URL at deploy time
# to point at a managed Postgres instance instead.
ENV DB_DRIVER=sqlite
ENV SQLITE_PATH=/app/data/contacts.db
RUN mkdir -p /app/data && chown -R appuser:appuser /app

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:8080/healthz', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["sh", "-c", "node --no-warnings src/db/migrate.js && node --no-warnings src/index.js"]
