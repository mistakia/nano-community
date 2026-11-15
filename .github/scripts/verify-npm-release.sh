#!/usr/bin/env bash
# Verifies a published nano-community-cli from the outside, run from cli/ at
# the commit that published it: the registry serves the version, its tarball
# matches the integrity npm states and holds exactly this commit's files, its
# SLSA provenance names this commit, this workflow and that tarball, and npm
# verifies the registry signature and the attestation from a clean install.
# Usage: GITHUB_SHA=<commit> verify-npm-release.sh
set -euo pipefail

fail() {
  echo "$*" >&2
  exit 1
}

name=$(node -p "require('./package.json').name")
version=$(node -p "require('./package.json').version")
work=$(mktemp -d)

# The registry can take a few minutes to serve a new version
for attempt in $(seq 1 30); do
  curl -sf "https://registry.npmjs.org/${name}/${version}" -o "$work/manifest.json" && break
  sleep 10
done
[ -s "$work/manifest.json" ] || fail "the registry does not serve ${name}@${version}"

curl -sf "$(jq -r .dist.tarball "$work/manifest.json")" -o "$work/package.tgz"
integrity="sha512-$(openssl dgst -sha512 -binary "$work/package.tgz" | base64 -w0)"
[ "$integrity" = "$(jq -r .dist.integrity "$work/manifest.json")" ] ||
  fail "the tarball does not match the integrity the registry states"

mkdir "$work/published"
tar -xzf "$work/package.tgz" -C "$work/published"
expected=$({ echo package.json; jq -r '.files[]' package.json; } | sort)
actual=$(cd "$work/published/package" && find . -type f | sed 's|^\./||' | sort)
if [ "$expected" != "$actual" ]; then
  diff <(echo "$expected") <(echo "$actual") >&2 || true
  fail "the tarball's files are not the package.json files list"
fi
for file in $expected; do
  cmp -s "$work/published/package/$file" "$file" ||
    fail "the published ${file} differs from ${GITHUB_SHA}'s"
done

curl -sf "https://registry.npmjs.org/-/npm/v1/attestations/${name}@${version}" \
  -o "$work/attestations.json" || fail "${name}@${version} has no attestations"
jq -r '.attestations[] | select(.predicateType == "https://slsa.dev/provenance/v1")
  | .bundle.dsseEnvelope.payload' "$work/attestations.json" | base64 -d >"$work/provenance.json"
digest=$(openssl dgst -sha512 "$work/package.tgz" | awk '{print $NF}')
jq -e --arg sha "$GITHUB_SHA" --arg digest "$digest" --arg subject "pkg:npm/${name}@${version}" '
  .subject == [{ name: $subject, digest: { sha512: $digest } }] and
  .predicate.buildDefinition.externalParameters.workflow.repository == "https://github.com/mistakia/nano-community" and
  .predicate.buildDefinition.externalParameters.workflow.path == ".github/workflows/publish-npm.yml" and
  .predicate.buildDefinition.externalParameters.workflow.ref == "refs/heads/main" and
  .predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit == $sha
' "$work/provenance.json" >/dev/null ||
  fail "the provenance does not name ${GITHUB_SHA}, publish-npm.yml on main and this tarball"

# A clean install, as an operator's: npm checks the registry signature and
# the attestation's Sigstore bundle, and the bin runs
cd "$work" && mkdir install && cd install
npm init -y >/dev/null
npm install --ignore-scripts --no-audit --no-fund "${name}@${version}" >/dev/null
npm audit signatures
[ "$(npx --no-install nano-community --version)" = "$version" ] ||
  fail "the installed bin does not report ${version}"
echo "${name}@${version} matches ${GITHUB_SHA}: files, integrity, provenance and signatures"
