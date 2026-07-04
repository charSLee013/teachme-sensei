# Misconception Audit #04: test.sh Overclaim

## The Misconception

Chapter 14 originally showed a fabricated `test.sh` containing:

```bash
#!/usr/bin/env bash
# test.sh — 运行全量测试
set -euo pipefail

npm install
npm run check
npm run check
npm test -- --coverage
npm run build
```

## Reality

**FALSE.** The real `test.sh` is much simpler:

```bash
#!/usr/bin/env bash
set -e

# 1. Back up auth.json
mv "$HOME/.pi/agent/auth.json" "$HOME/.pi/agent/auth.json.bak"

# 2. Unset all API keys (~30+ env vars)
unset ANTHROPIC_API_KEY
unset OPENAI_API_KEY
# ...

# 3. Run tests
npm test
```

It does **not** call `npm install`, `npm run check`, or `npm run build`. Its sole purpose is to run `npm test` without any real API keys present, so CI-safe local testing works.

## Source Evidence

- `test.sh` — the actual file (79 lines)
- Lines 1-20: auth.json backup/restore
- Lines 22-74: unset environment variables
- Line 78: `npm test`

## Why This Happened

The fabricated version looked more "professional" — each step was a command a reader might expect in a test script. But the real script's design is intentional: simple, focused on one purpose (no-API-key testing).

## Corrected In

- `chapters/14-contributing.html` section 14.5 — rewritten with accurate script content
- Described actual 3-step purpose: backup auth → clear keys → `npm test`
