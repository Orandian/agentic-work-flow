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

  # Use Python 3.13 for the ai-search venv — many packages (pydantic-core, chromadb)
  # use PyO3 which currently supports Python ≤ 3.13. Python 3.14 support is in progress.
  AI_PYTHON=""
  for ver in python3.13 python3.12 python3.11 python3; do
    if command -v "$ver" &>/dev/null; then
      PY_MAJOR="$("$ver" -c 'import sys; print(sys.version_info.minor)')"
      PY_FULL="$("$ver" --version 2>&1)"
      # Prefer 3.13 or lower; skip 3.14+ for now
      if [ "$("$ver" -c 'import sys; print(sys.version_info.major)')" -eq 3 ] && [ "$PY_MAJOR" -le 13 ]; then
        AI_PYTHON="$ver"
        break
      fi
    fi
  done

  if [ -z "$AI_PYTHON" ]; then
    echo "  ⚠  Python ≤ 3.13 not found — trying system python3 (may fail on 3.14)"
    AI_PYTHON=python3
  fi

  echo "  Using $AI_PYTHON ($($AI_PYTHON --version 2>&1)) for ai-search venv"

  # Remove stale venv if it was built against a different Python binary
  if [ -d "venv" ]; then
    VENV_PYTHON="$(venv/bin/python3 --version 2>/dev/null || echo 'unknown')"
    TARGET_PYTHON="$($AI_PYTHON --version 2>/dev/null || echo 'none')"
    if [ "$VENV_PYTHON" != "$TARGET_PYTHON" ]; then
      echo "  Rebuilding venv ($VENV_PYTHON → $TARGET_PYTHON)..."
      rm -rf venv
    fi
  fi

  if [ ! -d "venv" ]; then
    echo "  Creating Python virtual environment..."
    "$AI_PYTHON" -m venv venv
  fi

  echo "  Installing Python dependencies..."
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
