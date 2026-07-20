#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPIMAGE="$SCRIPT_DIR/release/XP Playground-1.0.0.AppImage"
INSTALL_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
APP_BIN="$INSTALL_DIR/xp-playground.AppImage"

if [ ! -f "$APPIMAGE" ]; then
  echo "Error: no se encontró el AppImage en release/"
  echo "Ejecuta primero: npm run electron:build"
  exit 1
fi

mkdir -p "$INSTALL_DIR" "$DESKTOP_DIR"

cp "$APPIMAGE" "$APP_BIN"
chmod +x "$APP_BIN"

cat > "$DESKTOP_DIR/xp-playground.desktop" << EOF
[Desktop Entry]
Name=XP Playground
Comment=JavaScript · TypeScript · Python playground
Exec=$APP_BIN
Icon=accessories-text-editor
Type=Application
Categories=Development;Utility;
Terminal=false
StartupNotify=true
EOF

update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true

echo "Instalado en:  $APP_BIN"
echo "Lanzador en:   $DESKTOP_DIR/xp-playground.desktop"
echo ""
echo "Busca 'XP Playground' en el menú de aplicaciones."
