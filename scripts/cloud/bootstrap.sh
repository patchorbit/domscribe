#!/usr/bin/env bash
# Controlled public-source smoke workload. No credentials or host mounts.
set -euo pipefail
export CI=true NEXT_TELEMETRY_DISABLED=1 NUXT_TELEMETRY_DISABLED=1 NX_DAEMON=false
export NODE_OPTIONS=--max-old-space-size=4096 RAYON_NUM_THREADS=2
commit=${1:?exact source commit required}
[[ "$commit" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid source commit' >&2; exit 2; }
root=/tmp/domscribe-cloud-smoke
report=/tmp/domscribe-cloud-evidence
# A new VM is required; never overwrite an earlier workload.
[[ ! -e "$root" && ! -e "$report" ]] || { echo 'Smoke workspace already exists' >&2; exit 2; }
mkdir -p "$root/tools" "$report"
cd "$root/tools"
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" != 24 ]]; then
  case "$(uname -m)" in x86_64) arch=x64;; aarch64|arm64) arch=arm64;; *) echo 'Unsupported architecture' >&2; exit 2;; esac
  archive="node-v24.22.1-linux-$arch.tar.xz"
  curl --fail --location --retry 2 --connect-timeout 15 --max-time 120 --output "$archive" "https://nodejs.org/dist/v24.22.1/$archive"
  curl --fail --location --retry 2 --connect-timeout 15 --max-time 30 --output SHASUMS256.txt https://nodejs.org/dist/v24.22.1/SHASUMS256.txt
  sha256sum --check --ignore-missing SHASUMS256.txt
  tar --extract --file "$archive"
  export PATH="$root/tools/node-v24.22.1-linux-$arch/bin:$PATH"
fi
npm install --prefix "$root/tools" --ignore-scripts --no-audit --no-fund pnpm@9.12.0
export PATH="$root/tools/node_modules/.bin:$PATH"
git clone --no-checkout --filter=blob:none https://github.com/patchorbit/domscribe.git "$root/base"
git -C "$root/base" fetch --depth=1 origin "$commit"
git -C "$root/base" worktree add --detach "$root/subject" "$commit"
cd "$root/subject"
[[ "$(git rev-parse HEAD)" == "$commit" ]]
node --input-type=module - "$report/provenance.json" "$commit" <<'JS'
import fs from 'node:fs';import os from 'node:os';
fs.writeFileSync(process.argv[2],JSON.stringify({commit:process.argv[3],node:process.version,platform:os.platform(),architecture:os.arch()},null,2));
JS
pnpm install --frozen-lockfile
pnpm exec nx run-many -t build,sync-dist --exclude domscribe-test-fixtures --parallel=2 --skip-nx-cache
pnpm --filter @domscribe/test-fixtures exec playwright install --with-deps chromium
node scripts/verify-instance-replay.mjs --framework=react --package-manager=npm --vite-version=7.3.7 --report-dir="$report"
# Keep installation/onboarding scope honest: the subject lockfile must stay intact.
git diff --exit-code -- package.json pnpm-lock.yaml pnpm-workspace.yaml
