#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_SRC="$SCRIPT_DIR/release/mac-arm64/XP Playground.app"
INSTALL_DIR="$HOME/Applications"
APP_DST="$INSTALL_DIR/XP Playground.app"

if [ ! -d "$APP_SRC" ]; then
  echo "Error: no se encontró XP Playground.app en release/mac-arm64/"
  echo "Ejecuta primero: npm run electron:build"
  exit 1
fi

mkdir -p "$INSTALL_DIR"
rm -rf "$APP_DST"
ditto "$APP_SRC" "$APP_DST"
xattr -dr com.apple.quarantine "$APP_DST" 2>/dev/null || true

echo "Instalado en: $APP_DST"
echo ""
open "$INSTALL_DIR"
