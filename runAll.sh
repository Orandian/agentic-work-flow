#!/bin/bash
# =============================================================================
# runAll.sh — ActiveCity Staff Portal — Mac / Linux
# Starts all services: PostgreSQL, ChromaDB, Spring Boot, Next.js, FastAPI RAG
# Usage: chmod +x runAll.sh && ./runAll.sh [--build] [--db-only] [--down] [--logs]
# =============================================================================

set -e

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
print_header() {
  clear
  echo ""
  echo -e "${BLUE}${BOLD}╔════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}${BOLD}║        ActiveCity Staff Portal — Run All           ║${NC}"
  echo -e "${BLUE}${BOLD}╚════════════════════════════════════════════════════╝${NC}"
  echo ""
}

ok()     { echo -e "  ${GREEN}✔${NC}  $1"; }
warn()   { echo -e "  ${YELLOW}⚠${NC}  $1"; }
fail()   { echo -e "  ${RED}✘${NC}  $1"; }
info()   { echo -e "  ${BLUE}ℹ${NC}  $1"; }
step()   { echo -e "\n${CYAN}${BOLD}▶ $1${NC}"; }
divider(){ echo -e "\n${BLUE}────────────────────────────────────────────────────${NC}"; }

# ── Detect docker compose command ─────────────────────────────────────────────
if docker compose version &>/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose &>/dev/null; then
  DC="docker-compose"
else
  fail "Docker Compose not found. Run ./setup.sh first."
  exit 1
fi

# ── Parse arguments ───────────────────────────────────────────────────────────
BUILD_FLAG=""
MODE="all"

for arg in "$@"; do
  case $arg in
    --build)   BUILD_FLAG="--build" ;;
    --db-only) MODE="db-only" ;;
    --down)    MODE="down" ;;
    --logs)    MODE="logs" ;;
    --tools)   TOOLS_PROFILE="--profile tools" ;;
    --help|-h)
      echo "Usage: ./runAll.sh [options]"
      echo ""
      echo "Options:"
      echo "  --build    Force rebuild all Docker images"
      echo "  --db-only  Start only PostgreSQL and ChromaDB"
      echo "  --down     Stop and remove all containers"
      echo "  --logs     Tail logs from all running containers"
      echo "  --tools    Also start pgAdmin (DB GUI on port 5050)"
      echo "  --help     Show this help message"
      exit 0
      ;;
  esac
done

# ─────────────────────────────────────────────────────────────────────────────
print_header

# ── Handle --down ─────────────────────────────────────────────────────────────
if [ "$MODE" = "down" ]; then
  step "Stopping all containers"
  $DC down --remove-orphans
  ok "All containers stopped"
  exit 0
fi

# ── Handle --logs ─────────────────────────────────────────────────────────────
if [ "$MODE" = "logs" ]; then
  step "Tailing logs (Ctrl+C to stop)"
  $DC logs -f
  exit 0
fi

# ── Pre-flight checks ─────────────────────────────────────────────────────────
step "Pre-flight checks"

# Docker running?
if ! docker info &>/dev/null 2>&1; then
  fail "Docker is not running — start Docker Desktop first"
  exit 1
fi
ok "Docker is running"

# .env file?
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    warn ".env created from .env.example — using default values"
    warn "Edit .env to set real credentials before going to production"
  else
    warn ".env not found — Docker will use built-in defaults"
  fi
else
  ok ".env file found"
fi

# ── Load .env ─────────────────────────────────────────────────────────────────
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

# ── Start services ────────────────────────────────────────────────────────────
if [ "$MODE" = "db-only" ]; then
  step "Starting database services only"
  $DC up -d db chroma $BUILD_FLAG
  ok "PostgreSQL and ChromaDB starting..."

else
  step "Building and starting all services"
  info "This may take a few minutes on first run (downloading images + building)"
  echo ""

  $DC up -d $BUILD_FLAG ${TOOLS_PROFILE:-}

  echo ""
  ok "All containers started"
fi

# ── Wait for services ─────────────────────────────────────────────────────────
divider
step "Waiting for services to be healthy"

wait_for_health() {
  local name=$1
  local max_wait=$2
  local elapsed=0

  printf "  Waiting for %-20s" "$name..."
  while [ $elapsed -lt $max_wait ]; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "activecity-$name" 2>/dev/null || echo "starting")
    if [ "$STATUS" = "healthy" ]; then
      echo -e " ${GREEN}healthy${NC} (${elapsed}s)"
      return 0
    elif [ "$STATUS" = "unhealthy" ]; then
      echo -e " ${RED}unhealthy${NC}"
      echo ""
      warn "Check logs: $DC logs activecity-$name"
      return 1
    fi
    sleep 3
    elapsed=$((elapsed + 3))
    printf "."
  done
  echo -e " ${YELLOW}timeout${NC} (check manually)"
  return 1
}

wait_for_health "db"      60
wait_for_health "backend" 120

# ── Service URLs ──────────────────────────────────────────────────────────────
FRONTEND_PORT=${FRONTEND_PORT:-3000}
BACKEND_PORT=${BACKEND_PORT:-8080}
AI_SEARCH_PORT=${AI_SEARCH_PORT:-8001}
CHROMA_PORT=${CHROMA_PORT:-8000}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
PGADMIN_PORT=${PGADMIN_PORT:-5050}

divider
echo ""
echo -e "${BOLD}  🚀 ActiveCity Staff Portal is running!${NC}"
echo ""
echo -e "  ${GREEN}●${NC}  Frontend     →  ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  ${GREEN}●${NC}  Backend API  →  ${CYAN}http://localhost:${BACKEND_PORT}/api/v1${NC}"
echo -e "  ${GREEN}●${NC}  AI Search    →  ${CYAN}http://localhost:${AI_SEARCH_PORT}/docs${NC}"
echo -e "  ${GREEN}●${NC}  ChromaDB     →  ${CYAN}http://localhost:${CHROMA_PORT}${NC}"
echo -e "  ${GREEN}●${NC}  PostgreSQL   →  ${CYAN}localhost:${POSTGRES_PORT}${NC}"

if [ -n "$TOOLS_PROFILE" ]; then
  echo -e "  ${GREEN}●${NC}  pgAdmin      →  ${CYAN}http://localhost:${PGADMIN_PORT}${NC}"
fi

echo ""
divider
echo ""
echo -e "  ${BOLD}Useful commands:${NC}"
echo -e "  View logs:        ${CYAN}$DC logs -f${NC}"
echo -e "  View one service: ${CYAN}$DC logs -f backend${NC}"
echo -e "  Stop all:         ${CYAN}./runAll.sh --down${NC}"
echo -e "  Restart + build:  ${CYAN}./runAll.sh --build${NC}"
echo -e "  DB GUI:           ${CYAN}./runAll.sh --tools${NC}"
echo -e "  Container status: ${CYAN}docker ps${NC}"
echo ""