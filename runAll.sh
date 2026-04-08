#!/usr/bin/env bash
# =============================================================================
# runAll.sh — ActiveCity Staff Portal
# Starts all services locally (infra via Docker, apps as local processes)
# Ctrl+C stops everything cleanly
# =============================================================================
set -euo pipefail


ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"


# ── Port map ──────────────────────────────────────────────────────────────────
PORT_DB=${POSTGRES_PORT:-5433}
PORT_CHROMA=${CHROMA_HOST_PORT:-8001}
PORT_BACKEND=${BACKEND_PORT:-8080}
PORT_FRONTEND=${FRONTEND_PORT:-3000}
PORT_AI_SEARCH=${AI_SEARCH_PORT:-8000}
PORT_PGADMIN=${PGADMIN_PORT:-5050}


# ── Open-browser helper (macOS / Linux / WSL) ─────────────────────────────────
OPEN_CMD="xdg-open"
if [[ "$OSTYPE" == "darwin"* ]]; then
  OPEN_CMD="open"
elif grep -qi microsoft /proc/version 2>/dev/null; then
  OPEN_CMD="$(command -v explorer.exe 2>/dev/null || echo /mnt/c/WINDOWS/explorer.exe)"
  # Strip Windows paths from PATH to avoid shebang conflicts in WSL
  CLEAN_PATH=""
  IFS=':' read -ra DIRS <<< "$PATH"
  for d in "${DIRS[@]}"; do
    case "$d" in /mnt/[a-zA-Z]/*) ;; *) CLEAN_PATH="${CLEAN_PATH:+$CLEAN_PATH:}$d" ;; esac
  done
  export PATH="$CLEAN_PATH"
fi


# ── Health check: wait until a port is accepting connections ──────────────────
# Usage: wait_for_port <port> <service-name> [timeout-seconds=60] [health-path]
wait_for_port() {
  local port="$1" name="$2" timeout="${3:-60}" health_path="${4:-}"
  local elapsed=0
  printf "  Waiting for %-28s" "${name} (port ${port})..."
  while [ $elapsed -lt $timeout ]; do
    if [ -n "$health_path" ]; then
      curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:${port}${health_path}" 2>/dev/null && \
        { echo " ✔ ready (${elapsed}s)"; return 0; }
    else
      curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:${port}/" 2>/dev/null || \
      curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:${port}/actuator/health" 2>/dev/null || \
      curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:${port}/health" 2>/dev/null && \
        { echo " ✔ ready (${elapsed}s)"; return 0; }
    fi
    sleep 3
    elapsed=$((elapsed + 3))
    printf "."
  done
  echo " ✖ timeout after ${timeout}s"
  return 1
}


# ── Cleanup: kill all child processes + Docker infra on Ctrl+C ───────────────
cleanup() {
  echo ""
  echo "Stopping all services..."
  kill 0 2>/dev/null || true
  wait 2>/dev/null || true

  echo "Stopping Docker infrastructure..."
  (cd "$ROOT_DIR" && docker compose down) 2>/dev/null || true

  echo "Done."
}
trap cleanup INT TERM


# ── Release any stale processes holding our ports ────────────────────────────
free_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti ":${port}" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "  Releasing port ${port} (PID ${pids})..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}
free_port "$PORT_BACKEND"
free_port "$PORT_FRONTEND"
free_port "$PORT_AI_SEARCH"


# ── Load root .env if present ─────────────────────────────────────────────────
if [ -f "$ROOT_DIR/.env" ]; then
  set -a; source "$ROOT_DIR/.env"; set +a
fi


MAILHOG_SMTP_PORT=${MAILHOG_SMTP_PORT:-1025}
MAILHOG_UI_PORT=${MAILHOG_UI_PORT:-8025}

echo ""
echo "=========================================="
echo " PostgreSQL + ChromaDB + MailHog  (Docker)"
echo "  PostgreSQL : port ${PORT_DB}"
echo "  ChromaDB   : port ${PORT_CHROMA}"
echo "  MailHog    : smtp ${MAILHOG_SMTP_PORT}  ui ${MAILHOG_UI_PORT}"
echo "=========================================="
cd "$ROOT_DIR"
docker compose up -d db chroma mailhog


echo ""
echo "=========================================="
echo " Spring Boot Backend  (port ${PORT_BACKEND})"
echo "=========================================="
if [ -f "$ROOT_DIR/activecity-api/mvnw" ]; then
  (cd "$ROOT_DIR/activecity-api" && set -a && [ -f .env ] && source .env; set +a && ./mvnw spring-boot:run -q) &
elif command -v mvn &>/dev/null; then
  (cd "$ROOT_DIR/activecity-api" && set -a && [ -f .env ] && source .env; set +a && mvn spring-boot:run -q) &
else
  echo "  ⚠  Maven not found — skipping backend"
fi


echo ""
echo "=========================================="
echo " Next.js Frontend  (port ${PORT_FRONTEND})"
echo "=========================================="
if [ -f "$ROOT_DIR/activecity-web/package.json" ]; then
  if command -v pnpm &>/dev/null; then
    (cd "$ROOT_DIR/activecity-web" && pnpm dev) &
  else
    (cd "$ROOT_DIR/activecity-web" && npm run dev) &
  fi
else
  echo "  ⚠  activecity-web/package.json not found — skipping frontend"
fi


echo ""
echo "=========================================="
echo " AI Search — FastAPI RAG  (port ${PORT_AI_SEARCH})"
echo "=========================================="
if [ -f "$ROOT_DIR/ai-search/requirements.txt" ]; then
  if [ -f "$ROOT_DIR/ai-search/venv/bin/activate" ]; then
    (cd "$ROOT_DIR/ai-search" && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port "$PORT_AI_SEARCH" --reload) &
  else
    echo "  ⚠  ai-search/venv not found — run init.sh first to create the virtual environment"
  fi
else
  echo "  ⚠  ai-search/requirements.txt not found — skipping"
fi


echo ""
echo "=========================================="
echo " pgAdmin  (Docker — optional)"
echo "  Run with: docker compose --profile tools up -d pgadmin"
echo "=========================================="


echo ""
echo "=========================================="
echo " Health checks"
echo "=========================================="
wait_for_port "$PORT_DB"         "PostgreSQL"        60                          || true
wait_for_port "$PORT_CHROMA"     "ChromaDB"          60  "/api/v2/heartbeat"       || true
wait_for_port "$PORT_BACKEND"    "Spring Boot"      120  "/actuator/health"        || true
wait_for_port "$PORT_FRONTEND"   "Next.js"           90                            || true
wait_for_port "$PORT_AI_SEARCH"  "AI Search"         90  "/health"                 || true
echo ""


# ── Open browser tabs (only for services that responded) ─────────────────────
curl -sf -o /dev/null --max-time 1 "http://localhost:${PORT_FRONTEND}/" && \
  "$OPEN_CMD" "http://localhost:${PORT_FRONTEND}" 2>/dev/null || true
curl -sf -o /dev/null --max-time 1 "http://localhost:${PORT_BACKEND}/actuator/health" && \
  "$OPEN_CMD" "http://localhost:${PORT_BACKEND}/swagger-ui" 2>/dev/null || true
curl -sf -o /dev/null --max-time 1 "http://localhost:${PORT_AI_SEARCH}/health" && \
  "$OPEN_CMD" "http://localhost:${PORT_AI_SEARCH}/docs" 2>/dev/null || true


echo ""
echo "=========================================="
echo " All services running — Ctrl+C to stop"
echo ""
echo "  Frontend   (Next.js)          :  http://localhost:${PORT_FRONTEND}"
echo "  Backend    (Spring Boot API)  :  http://localhost:${PORT_BACKEND}"
echo "  AI Search  (FastAPI RAG)      :  http://localhost:${PORT_AI_SEARCH}"
echo "  AI Docs    (Swagger UI)       :  http://localhost:${PORT_AI_SEARCH}/docs"
echo "  PostgreSQL                    :  localhost:${PORT_DB}"
echo "  ChromaDB                      :  http://localhost:${PORT_CHROMA}"
echo "  MailHog   (catch emails)      :  http://localhost:${MAILHOG_UI_PORT}"
echo ""
echo "  Optional:"
echo "  pgAdmin  :  docker compose --profile tools up -d pgadmin"
echo "              http://localhost:${PORT_PGADMIN}"
echo "=========================================="
echo ""


wait
