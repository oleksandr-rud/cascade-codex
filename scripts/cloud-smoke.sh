#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

if command -v bun >/dev/null 2>&1; then
  cascade_bun=(bun)
elif command -v npx >/dev/null 2>&1; then
  # The environment's Install script must cache this version first.
  cascade_bun=(npx --offline --yes bun@1.3.3)
else
  echo 'cascade_cloud_smoke_status=BLOCKED reason=Bun_1.3.3_unavailable' >&2
  exit 1
fi

if [[ "$("${cascade_bun[@]}" --version)" != '1.3.3' ]]; then
  echo 'cascade_cloud_smoke_status=BLOCKED reason=expected_Bun_1.3.3' >&2
  exit 1
fi

"${cascade_bun[@]}" scripts/cascade.ts validate
"${cascade_bun[@]}" scripts/cascade.ts workflow catalog --check
"${cascade_bun[@]}" run test
"${cascade_bun[@]}" run build:runtime

(
  cd dist/cascade-runtime
  "${cascade_bun[@]}" .codex/runtime/cascade.js admission validate
  # Catalog generation is source-only; the core consumes the frozen catalog.
  "${cascade_bun[@]}" .codex/runtime/cascade.js workflow groups >/dev/null
)

echo 'cascade_cloud_smoke_status=PASS scope=SOURCE_AND_BUNDLED_RUNTIME'
echo 'plugin_installation=NOT_CHECKED terminal_simulations=NOT_RUN codex_cloud_task=NOT_RUN'
