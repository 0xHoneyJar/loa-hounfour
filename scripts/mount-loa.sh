#!/usr/bin/env bash
# Mount Loa framework for development sessions.
#
# The Loa framework is not tracked in git — it mounts ephemerally
# from the upstream remote when you need development tooling.
#
# Usage:
#   ./scripts/mount-loa.sh           # Mount framework
#   ./scripts/mount-loa.sh --update  # Update existing mount
#   ./scripts/mount-loa.sh --clean   # Remove mounted framework
#
# Prerequisites:
#   git remote add loa https://github.com/0xHoneyJar/loa.git

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors (if terminal supports them)
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  RED='\033[0;31m'
  NC='\033[0m'
else
  GREEN='' YELLOW='' RED='' NC=''
fi

info()  { echo -e "${GREEN}[mount-loa]${NC} $*"; }
warn()  { echo -e "${YELLOW}[mount-loa]${NC} $*"; }
error() { echo -e "${RED}[mount-loa]${NC} $*" >&2; }

# --- Clean mode ---
if [[ "${1:-}" == "--clean" ]]; then
  info "Removing mounted framework files..."
  rm -rf .claude/ .run/ .beads/ grimoires/ .loa.config.yaml .loa-version.json
  info "Clean complete. Framework unmounted."
  exit 0
fi

# --- Check loa remote ---
if ! git remote get-url loa &>/dev/null; then
  error "Remote 'loa' not configured."
  echo "  git remote add loa https://github.com/0xHoneyJar/loa.git"
  exit 1
fi

# --- Fetch latest ---
info "Fetching from loa remote..."
git fetch loa main --quiet

# --- Mount or update .claude/ ---
if [[ "${1:-}" == "--update" ]] || [[ ! -d ".claude/skills" ]]; then
  info "Mounting .claude/ from loa/main..."
  git checkout loa/main -- .claude/ 2>/dev/null || {
    error "Failed to checkout .claude/ from loa/main"
    exit 1
  }
  # Unstage the checkout (we don't want it tracked)
  git reset HEAD -- .claude/ &>/dev/null || true
  info ".claude/ mounted successfully."
else
  info ".claude/ already mounted. Use --update to refresh."
fi

# --- Create state directories ---
mkdir -p .run .beads
info "State directories ready (.run/, .beads/)"

# --- Symlink grimoires/loa → docs ---
if [[ ! -e "grimoires/loa" ]]; then
  mkdir -p grimoires
  ln -sf "$PROJECT_ROOT/docs" grimoires/loa
  info "Symlinked grimoires/loa -> docs/"
else
  info "grimoires/loa already exists."
fi

# --- Config file ---
if [[ ! -f ".loa.config.yaml" ]] && [[ -f ".loa.config.yaml.example" ]]; then
  cp .loa.config.yaml.example .loa.config.yaml
  info "Created .loa.config.yaml from example."
fi

# --- Version file ---
if [[ -f ".claude/loa/CLAUDE.loa.md" ]]; then
  version=$(head -1 .claude/loa/CLAUDE.loa.md | grep -oP 'version: \K[0-9.]+' || echo "unknown")
  echo "{\"version\": \"$version\"}" > .loa-version.json
  info "Loa version: $version"
fi

# --- Summary ---
echo ""
info "Loa framework mounted successfully."
echo ""
echo "  Available commands:"
echo "    /loa              — Status and next steps"
echo "    /plan             — Plan your project"
echo "    /build            — Build current sprint"
echo "    /review           — Review your work"
echo "    /ship             — Deploy and archive"
echo ""
echo "  To update:  ./scripts/mount-loa.sh --update"
echo "  To remove:  ./scripts/mount-loa.sh --clean"
