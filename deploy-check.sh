#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# deploy-check.sh — Pre-deployment validation
# Run this before pushing to ensure everything is ready.
# Usage: bash deploy-check.sh
# ═══════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }

echo ""
echo "═══ DEPLOYMENT READINESS CHECK ═══"
echo ""

# ── 1. Backend env vars ──
echo "Backend .env.example:"
for var in DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET NODE_ENV CORS_ORIGINS SERVER_URL CLIENT_URL FRONTEND_URL; do
  if grep -q "^${var}=" backend/.env.example 2>/dev/null; then
    pass "$var is documented"
  else
    fail "$var missing from .env.example"
  fi
done

echo ""
echo "Frontend .env.example:"
for var in VITE_API_URL VITE_BACKEND_URL VITE_GOOGLE_CLIENT_ID; do
  if grep -q "^${var}=" frontend/.env.example 2>/dev/null; then
    pass "$var is documented"
  else
    fail "$var missing from .env.example"
  fi
done

# ── 2. Build checks ──
echo ""
echo "Build verification:"

cd frontend
if npm run build --silent 2>/dev/null; then
  pass "Frontend (vite build) succeeds"
else
  fail "Frontend build FAILED"
fi
cd ..

cd backend
if node --check src/index.js 2>/dev/null; then
  pass "Backend (node --check) passes"
else
  fail "Backend syntax check FAILED"
fi
cd ..

# ── 3. Config files ──
echo ""
echo "Deployment config files:"
[ -f render.yaml ] && pass "render.yaml exists" || fail "render.yaml missing"
[ -f frontend/vercel.json ] && pass "vercel.json exists" || fail "vercel.json missing"
[ -f DEPLOYMENT.md ] && pass "DEPLOYMENT.md exists" || fail "DEPLOYMENT.md missing"

# ── 4. Hardcoded URLs (quick check) ──
echo ""
echo "Hardcoded localhost references in source (should be 0 in production code):"
count=$(grep -r "localhost" backend/src/ frontend/src/ --include="*.js" --include="*.jsx" -l 2>/dev/null | grep -v node_modules | grep -v dist | wc -l)
if [ "$count" -eq 0 ]; then
  pass "No hardcoded localhost references"
else
  warn "$count files still reference localhost (check if they have env var fallbacks)"
fi

echo ""
echo "═══ CHECK COMPLETE ═══"
echo ""
