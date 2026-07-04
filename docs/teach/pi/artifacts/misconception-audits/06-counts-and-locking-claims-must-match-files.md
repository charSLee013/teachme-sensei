# Misconception Audit #06: Counts And Locking Claims Must Match Real Files

## The Misconception

Several teaching claims sounded plausible but were not tied to the checked repository:

- homepage label `Source Files` for a TypeScript-wide count;
- `.npmrc` described as carrying an `integrity` field;
- Docker/container example used `npm install --prod --frozen-lockfile`.

## Reality

**FALSE or misleading.**

- The `798` figure comes from counting `*.ts` files under `packages/`, so the correct label is `TypeScript Files`.
- Root `.npmrc` currently contains only `save-exact=true` and `min-release-age=2`.
- Current repo docs teach `npm install --ignore-scripts`, `npm run check`, and `./test.sh`; they do not teach `--frozen-lockfile` as the contributor path.

## Source Evidence

- root `.npmrc`
- root `README.md` development commands
- root `CONTRIBUTING.md` PR checklist
- file count command: `find packages -name '*.ts' -not -path '*/node_modules/*' -not -path '*/dist/*'`

## Why This Happened

These errors came from importing familiar Node ecosystem phrases without checking the local repo files. The wording looked reasonable, but it stopped being evidence-based.

## Corrected In

- `index.html` now labels `798` as `TypeScript Files`.
- `chapters/14-contributing.html` now explains the actual `.npmrc` hardening fields.
- `chapters/14-contributing.html` container example now uses `npm ci --ignore-scripts --omit=dev` with `package-lock.json`.
