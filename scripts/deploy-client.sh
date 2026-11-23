#!/usr/bin/env bash
# Publishes build/ to the origin host, assets first.
#
# 1. build/assets/ without --delete: content-addressed files are only added, so
#    a page cached at the edge (up to 5 minutes) or open in a tab keeps
#    loading the chunks it references.
# 2. Everything else with --delete, excluding assets/: new HTML lands only
#    after its assets, and retired prerendered pages are removed.
# 3. Prune assets whose mtime is over 30 days. rsync -a carries the build's
#    mtime, so a file still produced by a recent build is kept.
set -euo pipefail

remote_host="${DEPLOY_HOST:-nano-community}"
remote_build="${DEPLOY_PATH:-/root/nano-community/source/build}"
retention_days=30
rsync_flags=(-a ${DEPLOY_RSYNC_FLAGS:-})

cd "$(dirname "$0")/.."

if [ ! -f build/index.html ] || [ ! -d build/assets ]; then
  echo "build/ is missing index.html or assets/; run yarn build first" >&2
  exit 1
fi

rsync "${rsync_flags[@]}" build/assets/ "${remote_host}:${remote_build}/assets/"
rsync "${rsync_flags[@]}" --delete --exclude /assets/ build/ "${remote_host}:${remote_build}/"
if [[ " ${rsync_flags[*]} " != *" --dry-run "* ]]; then
  ssh "$remote_host" "find '${remote_build}/assets' -type f -mtime +${retention_days} -delete"
fi
