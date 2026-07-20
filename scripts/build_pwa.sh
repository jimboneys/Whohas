#!/usr/bin/env bash
# Rebuild the WhoHas PWA static bundle pointing at a PRODUCTION backend URL.
#
# Usage:
#   ./scripts/build_pwa.sh https://your-backend.onrender.com
#
# It does NOT touch frontend/.env (your local preview keeps working).
# Output: fresh /app/frontend/dist  and  /app/whohas-pwa.zip
set -euo pipefail

BACKEND_URL="${1:-}"
if [[ -z "$BACKEND_URL" ]]; then
  echo "❌ Provide your production backend URL, e.g.:"
  echo "   ./scripts/build_pwa.sh https://your-backend.onrender.com"
  exit 1
fi
# strip any trailing slash
BACKEND_URL="${BACKEND_URL%/}"

FRONTEND_DIR="/app/frontend"
cd "$FRONTEND_DIR"

echo "🏗  Building PWA against backend: $BACKEND_URL"
rm -rf dist
EXPO_PUBLIC_BACKEND_URL="$BACKEND_URL" npx expo export -p web

# README (build info)
cat > dist/README-PWA.txt <<EOF
WhoHas — PWA build
Backend: $BACKEND_URL
Host the contents of this folder at the site ROOT over HTTPS.
Vercel: this folder already contains vercel.json (SPA rewrites + PWA headers).
EOF

cd dist
rm -f /app/whohas-pwa.zip
zip -rq /app/whohas-pwa.zip .
echo "✅ Done."
echo "   dist:  $FRONTEND_DIR/dist"
echo "   zip:   /app/whohas-pwa.zip"
