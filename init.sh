#!/usr/bin/env bash
# =============================================================================
# init.sh — ActiveCity Staff Portal
# Full initialisation: check prerequisites → build all services → run
# Usage: chmod +x init.sh && ./init.sh [--skip-setup] [--build]
# =============================================================================
set -uo pipefail  # note: -e removed so individual step failures don't abort the whole script


ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"


echo "######################################"
echo "# [STEP 1] Prerequisites Check"
echo "######################################"

SKIP_SETUP=false
BUILD_FLAG=""

for arg in "$@"; do
  case $arg in
    --skip-setup) SKIP_SETUP=true ;;
    --build)      BUILD_FLAG="--build" ;;
    --help|-h)
      echo "Usage: ./init.sh [options]"
      echo ""
      echo "Options:"
      echo "  --skip-setup   Skip prerequisite check"
      echo "  --build        Force rebuild Docker images"
      echo "  --help         Show this message"
      exit 0
      ;;
  esac
done

if [ "$SKIP_SETUP" = true ]; then
  echo "  Skipping (--skip-setup)"
else
  bash "$ROOT_DIR/setup.sh"
fi


echo ""
echo "######################################"
echo "# [STEP 2] Environment Setup"
echo "######################################"

setup_env() {
  local env_file=$1 example=$2 label=$3
  if [ -f "$env_file" ]; then
    echo "  ✔  $label: $env_file"
  elif [ -f "$example" ]; then
    cp "$example" "$env_file"
    echo "  ⚠  $label: created from example — fill in real values before production"
  else
    echo "  ⚠  $label: no example found — skipping"
  fi
}

setup_env "$ROOT_DIR/activecity-api/.env"       "$ROOT_DIR/activecity-api/.env.example"  "Backend"
setup_env "$ROOT_DIR/activecity-web/.env.local"  "$ROOT_DIR/activecity-web/.env.example"  "Frontend"
setup_env "$ROOT_DIR/ai-search/.env"             "$ROOT_DIR/ai-search/.env.example"       "AI Search"


echo ""
echo "######################################"
echo "# [STEP 3] Build — Backend (Spring Boot)"
echo "######################################"

if [ -f "$ROOT_DIR/activecity-api/mvnw" ]; then
  echo "  Building with Maven wrapper..."
  cd "$ROOT_DIR/activecity-api"
  ./mvnw clean package -DskipTests -q
  echo "  ✔  Backend build complete"
  cd "$ROOT_DIR"
elif command -v mvn &>/dev/null; then
  echo "  Building with system Maven..."
  cd "$ROOT_DIR/activecity-api"
  mvn clean package -DskipTests -q
  echo "  ✔  Backend build complete"
  cd "$ROOT_DIR"
else
  echo "  ⚠  Maven not found — Docker will build inside container"
fi


echo ""
echo "######################################"
echo "# [STEP 4] Build — Frontend (Next.js)"
echo "######################################"

if [ -f "$ROOT_DIR/activecity-web/package.json" ]; then
  cd "$ROOT_DIR/activecity-web"
  if command -v pnpm &>/dev/null; then
    echo "  Installing dependencies with pnpm..."
    pnpm install --silent
  else
    echo "  Installing dependencies with npm..."
    npm install --silent
  fi
  echo "  ✔  Frontend dependencies installed"
  cd "$ROOT_DIR"
else
  echo "  ⚠  activecity-web/package.json not found — skipping"
fi


echo ""
echo "######################################"
echo "# [STEP 5] Build — AI Search (FastAPI)"
echo "######################################"

if [ -f "$ROOT_DIR/ai-search/requirements.txt" ]; then
  cd "$ROOT_DIR/ai-search"

  # Remove stale venv if it was built against a different Python version
  if [ -d "venv" ]; then
    VENV_PYTHON="$(venv/bin/python3 --version 2>/dev/null || echo '')"
    SYS_PYTHON="$(python3 --version 2>/dev/null || echo '')"
    if [ "$VENV_PYTHON" != "$SYS_PYTHON" ]; then
      echo "  Python version mismatch ($VENV_PYTHON vs $SYS_PYTHON) — rebuilding venv..."
      rm -rf venv
    fi
  fi

  if [ ! -d "venv" ]; then
    echo "  Creating Python virtual environment..."
    python3 -m venv venv
  fi

  echo "  Installing Python dependencies..."
  # Run in a subshell so activate/deactivate don't affect the parent
  if ( source venv/bin/activate && pip install -r requirements.txt -q && deactivate ); then
    echo "  ✔  AI Search dependencies installed"
  else
    echo "  ⚠  AI Search install had errors — check output above"
    echo "     The service will be skipped in runAll.sh until fixed"
  fi
  cd "$ROOT_DIR"
else
  echo "  ⚠  ai-search/requirements.txt not found — skipping"
fi


echo ""
echo "######################################"
echo "# [STEP 6] Run"
echo "######################################"

bash "$ROOT_DIR/runAll.sh" $BUILD_FLAG
