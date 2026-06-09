#!/bin/bash
# Deploy crontab files to a remote server using the additive ~/crontab/ pattern.
# Routes through bootstrap's deploy_crontab_scope helper (installed to ~/bin)
# so basenames removed from this source set are reaped from ~/crontab/ on the
# remote on the next deploy.
#
# Usage: server/deploy-crontab.sh <ssh-host> <source> <scope-key> [output-basename]
#
# source may be a directory of .cron files or a single source file. For the
# single-file case, output-basename pins the deployed filename (defaults to
# the source basename); use this to preserve a stable destination name across
# refactors so the manifest does not orphan-reap a renamed-but-current file.
# scope-key partitions the per-host manifest; pick a stable string distinct
# from other scopes on the same host (e.g. "nano-community-main",
# "nano-community-storage").

set -euo pipefail

if [ $# -lt 3 ] || [ $# -gt 4 ]; then
  echo "Usage: $(basename "$0") <ssh-host> <source> <scope-key> [output-basename]" >&2
  exit 1
fi

SSH_HOST="$1"
SOURCE="$2"
SCOPE_KEY="$3"

if [ ! -e "$SOURCE" ]; then
  echo "Error: source not found: $SOURCE" >&2
  exit 1
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

if [ -d "$SOURCE" ]; then
  for f in "$SOURCE"/*.cron; do
    base crontab build "$f" > "$TMPDIR/$(basename "$f")"
  done
else
  OUT_BASENAME="${4:-$(basename "$SOURCE")}"
  case "$OUT_BASENAME" in *.cron) ;; *) OUT_BASENAME="$OUT_BASENAME.cron" ;; esac
  base crontab build "$SOURCE" > "$TMPDIR/$OUT_BASENAME"
fi

REMOTE_TMP=$(ssh -A "$SSH_HOST" 'mktemp -d')
scp -q "$TMPDIR"/*.cron "$SSH_HOST":"$REMOTE_TMP/"
ssh -A "$SSH_HOST" "\$HOME/bin/deploy_crontab_scope '$SCOPE_KEY' '$REMOTE_TMP' cat && rm -rf '$REMOTE_TMP' && \$HOME/bin/load_crontab_files"

echo "Deployed $SOURCE to $SSH_HOST (scope=$SCOPE_KEY)"
