#!/usr/bin/env bash
# Install local git hooks for hounfour development.
#
# This script writes a pre-commit hook to .git/hooks/pre-commit that runs
# the pollution-grep guard locally before every commit. CI enforces the
# same check via .github/workflows/pollution-check.yml, but the local hook
# gives sub-second feedback so the maintainer doesn't push a polluted commit.
#
# CT-13 from cycle-005 RC1 register; CT-NFR-2 (pollution invariant).
#
# Usage: bash scripts/install-hooks.sh
#
# The hook is per-clone (lives under .git/hooks/, which is not tracked).
# Re-run this after cloning a fresh checkout.

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  echo "error: must be run from within a git working tree" >&2
  exit 1
fi

hook_path="$repo_root/.git/hooks/pre-commit"
mkdir -p "$(dirname "$hook_path")"

if [[ -e "$hook_path" ]] && ! grep -q 'hounfour-pollution-grep' "$hook_path"; then
  echo "warning: $hook_path exists and is not managed by this script."
  echo "  Existing hook content:"
  sed 's/^/    /' "$hook_path" | head -20
  echo ""
  echo "  Backing up to ${hook_path}.bak and overwriting."
  mv "$hook_path" "${hook_path}.bak"
fi

cat > "$hook_path" <<'HOOK_EOF'
#!/usr/bin/env bash
# hounfour-pollution-grep — installed by scripts/install-hooks.sh.
#
# Reject any commit whose staged diff contains framework-internal terms.
# The patterns use word boundaries + case-distinction so the package name
# (lowercase scope) and innocent words containing substrings (e.g.
# "payload", "broadcast") are not false-positives.

set -euo pipefail

# Capital-L framework-name is the proper-noun reference; lowercase form
# alone is allowed (it is the npm scope on the package itself). Concepts
# that are always proper nouns or hyphenated identifiers match case-
# insensitively. See CLAUDE.local.md for the full term list and rationale.
pattern='\bLoa\b|\b[Ss]pirals?\b|\b[Ss]imstim\b|\b[Ff]latline\b|\b[Bb]ridgebuilder\b|\b[Bb]utterfreezone\b|\b[Gg]rimoires?\b|\bbeads\b|\brun-mode\b|\balways-on-vps\b'

# Inspect ADDITIONS only (lines starting with `+`, excluding `+++` file
# headers). Matching deletions would block legitimate cleanup commits that
# remove a previously-introduced forbidden term.
forbidden="$(git diff --cached --no-color 2>/dev/null \
  | grep -E '^\+' \
  | grep -vE '^\+\+\+' \
  | grep -E "$pattern" \
  || true)"

if [[ -n "$forbidden" ]]; then
  echo "ABORT: pollution-grep found framework-internal term(s) in staged diff."
  echo ""
  echo "$forbidden" | head -20
  echo ""
  echo "If this is intentional, the path is likely supposed to be gitignored"
  echo "(.git/info/exclude). Run 'git status' to verify — gitignored paths"
  echo "should not appear staged. Unstage with 'git reset HEAD <file>'."
  echo "To bypass intentionally (rare), commit with 'git commit --no-verify'"
  echo "and document the bypass."
  exit 1
fi

exit 0
HOOK_EOF

chmod +x "$hook_path"
echo "OK: pre-commit hook installed at $hook_path"
echo "    Test the hook by staging a file containing one of the terms"
echo "    listed in CLAUDE.local.md and running 'git commit'. The hook"
echo "    should abort with a 'pollution-grep found ...' message."
