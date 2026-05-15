#!/bin/bash

RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
CYAN='\033[1;36m'
RESET='\033[0m'

PROJECT_PATH="${1:-$(pwd)}"
SCRIPT_NAME="$(basename "$0")"

GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_USER="${GITHUB_USER:-HacheJotaDev}"
GITHUB_REPO="${GITHUB_REPO:-HacheBot}"

if [ -n "$GITHUB_TOKEN" ]; then
  GIT_REMOTE="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
  git remote set-url origin "$GIT_REMOTE" 2>/dev/null
else
  GIT_REMOTE="https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
  git remote set-url origin "$GIT_REMOTE" 2>/dev/null
fi

cd "$PROJECT_PATH" || { echo "No se pudo acceder a $PROJECT_PATH"; exit 1; }

phrases=(
  "Auto Push"
)

log() {
  echo -e "${CYAN}[$(date +'%H:%M:%S')]${RESET} $1"
}

log "Buscando cambios en: ${GREEN}$PROJECT_PATH${RESET}"

inotifywait -m -e modify,create,delete -r "$PROJECT_PATH" \
  --exclude "(\.git|node_modules)" \
  --format "%w %e %f" |
while read -r directory events filename; do

  log "${YELLOW}Cambios detectados en:${RESET} $filename"
  sleep 1

  git add . ":!$SCRIPT_NAME"

  if ! git diff --cached --quiet; then
    commit_message="${phrases[$RANDOM % ${#phrases[@]}]} | $(date +'%d-%m %H:%M')"
    git commit -m "$commit_message"
    echo -e "${BLUE}Commit realizado con mensaje:${RESET} ${GREEN}\"$commit_message\"${RESET}"
  else
    echo -e "${RED}No hay cambios para subir.${RESET}"
  fi

  if git push; then
    log "${GREEN}Push completado ✅${RESET}\n"
  else
    log "${RED}Error al hacer push${RESET}\n"
  fi

done
