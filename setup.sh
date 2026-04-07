#!/bin/bash
# =============================================================================
# setup.sh — ActiveCity Staff Portal — Mac / Linux
# Checks all required tools, installs missing ones, and prepares the project.
# Usage: chmod +x setup.sh && ./setup.sh
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
  echo ""
  echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}${BOLD}║   ActiveCity Staff Portal — Setup Check      ║${NC}"
  echo -e "${BLUE}${BOLD}╚══════════════════════════════════════════════╝${NC}"
  echo ""
}

print_section() { echo -e "\n${CYAN}${BOLD}▶ $1${NC}"; }
ok()   { echo -e "  ${GREEN}✔${NC}  $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC}  $1"; }
fail() { echo -e "  ${RED}✘${NC}  $1"; }
info() { echo -e "  ${BLUE}ℹ${NC}  $1"; }

ERRORS=0
WARNINGS=0
check_fail() { fail "$1"; ERRORS=$((ERRORS + 1)); }
check_warn() { warn "$1"; WARNINGS=$((WARNINGS + 1)); }

# ── Version comparator ────────────────────────────────────────────────────────
require_min_version() {
  local name=$1 current=$2 required=$3
  if [ "$(printf '%s\n' "$required" "$current" | sort -V | head -n1)" = "$required" ]; then
    ok "$name $current  (minimum: $required)"
  else
    check_fail "$name $current is below minimum required $required"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
print_header

# ── 1. Java ───────────────────────────────────────────────────────────────────
print_section "Java (Spring Boot backend)"

if command -v java &>/dev/null; then
  JAVA_VER=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
  require_min_version "Java" "$JAVA_VER" "17"
else
  check_fail "Java not found"
  info "Mac:   brew install openjdk@17 && sudo ln -sfn \$(brew --prefix openjdk@17)/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk"
  info "Linux: sudo apt install openjdk-17-jdk"
fi

# ── 2. Maven wrapper ──────────────────────────────────────────────────────────
print_section "Maven (Spring Boot build)"

if [ -f "./backend/mvnw" ]; then
  ok "Maven wrapper found at ./backend/mvnw"
elif command -v mvn &>/dev/null; then
  MVN_VER=$(mvn -version 2>&1 | awk '/Apache Maven/ {print $3}')
  require_min_version "Maven" "$MVN_VER" "3.8"
else
  check_warn "mvnw not found — will be created when Spring Boot project is scaffolded"
fi

# ── 3. Node.js ────────────────────────────────────────────────────────────────
print_section "Node.js (Next.js frontend)"

if command -v node &>/dev/null; then
  NODE_VER=$(node --version | sed 's/v//')
  require_min_version "Node.js" "$NODE_VER" "18.0"
else
  check_fail "Node.js not found"
  info "Mac:   brew install node"
  info "Linux: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install nodejs"
  info "Any:   https://github.com/nvm-sh/nvm (recommended)"
fi

# ── 4. pnpm / npm ─────────────────────────────────────────────────────────────
print_section "Package Manager"

if command -v pnpm &>/dev/null; then
  PNPM_VER=$(pnpm --version)
  require_min_version "pnpm" "$PNPM_VER" "8.0"
  PKG_MGR="pnpm"
elif command -v npm &>/dev/null; then
  NPM_VER=$(npm --version)
  require_min_version "npm" "$NPM_VER" "9.0"
  PKG_MGR="npm"
  check_warn "pnpm not installed — recommended for Next.js. Install: npm i -g pnpm"
else
  check_fail "Neither npm nor pnpm found"
  PKG_MGR=""
fi

# ── 5. Python ─────────────────────────────────────────────────────────────────
print_section "Python (FastAPI RAG service)"

if command -v python3 &>/dev/null; then
  PY_VER=$(python3 --version 2>&1 | awk '{print $2}')
  require_min_version "Python" "$PY_VER" "3.10"
else
  check_fail "Python 3 not found"
  info "Mac:   brew install python@3.11"
  info "Linux: sudo apt install python3.11 python3.11-venv"
fi

if command -v pip3 &>/dev/null; then
  ok "pip3 found"
else
  check_warn "pip3 not found"
  info "Mac:   brew install python@3.11 (includes pip)"
  info "Linux: sudo apt install python3-pip"
fi

# ── 6. Docker ─────────────────────────────────────────────────────────────────
print_section "Docker (PostgreSQL + services)"

if command -v docker &>/dev/null; then
  DOCKER_VER=$(docker --version | awk '{print $3}' | tr -d ',')
  require_min_version "Docker" "$DOCKER_VER" "24.0"

  if docker info &>/dev/null 2>&1; then
    ok "Docker daemon is running"
  else
    check_fail "Docker installed but NOT running — please start Docker Desktop"
  fi
else
  check_fail "Docker not found"
  info "Install Docker Desktop: https://www.docker.com/products/docker-desktop"
fi

if command -v docker &>/dev/null && docker compose version &>/dev/null 2>&1; then
  COMPOSE_VER=$(docker compose version --short 2>/dev/null || echo "2.x")
  ok "Docker Compose plugin v$COMPOSE_VER"
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  ok "docker-compose (standalone) found"
  COMPOSE_CMD="docker-compose"
else
  check_fail "Docker Compose not found"
  info "Install: https://docs.docker.com/compose/install/"
  COMPOSE_CMD=""
fi

# ── 7. Git ────────────────────────────────────────────────────────────────────
print_section "Git"

if command -v git &>/dev/null; then
  GIT_VER=$(git --version | awk '{print $3}')
  ok "Git $GIT_VER"
else
  check_fail "Git not found"
  info "Mac:   brew install git"
  info "Linux: sudo apt install git"
fi

# ── 8. .env files ─────────────────────────────────────────────────────────────
print_section "Environment Files"

declare -A ENV_MAP=(
  ["backend/.env"]="backend/.env.example"
  ["frontend/.env.local"]="frontend/.env.example"
  ["ai-search/.env"]="ai-search/.env.example"
)

for env_file in "${!ENV_MAP[@]}"; do
  example="${ENV_MAP[$env_file]}"
  if [ -f "$env_file" ]; then
    ok "$env_file exists"
  elif [ -f "$example" ]; then
    cp "$example" "$env_file"
    warn "$env_file created from example — open it and fill in your values"
  else
    check_warn "$env_file missing — example not available yet (scaffold first)"
  fi
done

# ── 9. Install frontend dependencies ──────────────────────────────────────────
print_section "Frontend Dependencies"

if [ -f "frontend/package.json" ] && [ -n "$PKG_MGR" ]; then
  info "Installing frontend dependencies with $PKG_MGR..."
  cd frontend
  $PKG_MGR install --silent 2>/dev/null && ok "Frontend dependencies installed" || check_warn "Frontend install had warnings"
  cd ..
else
  info "Skipping — frontend/package.json not found yet (scaffold first)"
fi

# ── 10. Python venv + dependencies ────────────────────────────────────────────
print_section "Python Dependencies (FastAPI RAG)"

if [ -f "ai-search/requirements.txt" ]; then
  info "Setting up Python virtual environment..."
  cd ai-search
  python3 -m venv venv && ok "Virtual environment created at ai-search/venv"
  source venv/bin/activate
  pip install -r requirements.txt -q && ok "Python dependencies installed"
  deactivate
  cd ..
else
  info "Skipping — ai-search/requirements.txt not found yet (scaffold first)"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}${BOLD}══════════════════════════════════════════════${NC}"
echo -e "  ${BOLD}Setup Summary${NC}"
echo -e "${BLUE}${BOLD}══════════════════════════════════════════════${NC}"

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "\n  ${GREEN}${BOLD}✔  All checks passed — you're ready to go!${NC}"
  echo -e "\n  Start the project:  ${CYAN}./runAll.sh${NC}"
elif [ "$ERRORS" -eq 0 ]; then
  echo -e "\n  ${YELLOW}${BOLD}⚠  $WARNINGS warning(s) — review above, then run:${NC}"
  echo -e "\n  Start the project:  ${CYAN}./runAll.sh${NC}"
else
  echo -e "\n  ${RED}${BOLD}✘  $ERRORS error(s) must be fixed before running${NC}"
  [ "$WARNINGS" -gt 0 ] && echo -e "  ${YELLOW}⚠  $WARNINGS warning(s) also found${NC}"
  echo -e "\n  Fix the issues above, then re-run:  ${CYAN}./setup.sh${NC}"
  exit 1
fi
echo ""