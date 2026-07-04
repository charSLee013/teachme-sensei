## Primary Sources

- `README.md`
- `CONTRIBUTING.md`
- `AGENTS.md`
- `package.json`
- `.npmrc`
- `packages/*/package.json`
- `packages/ai/src/types.ts`
- `packages/agent/src/agent.ts`
- `packages/agent/src/agent-loop.ts`
- `packages/agent/src/types.ts`
- `packages/coding-agent/src/core/tools/index.ts`
- `packages/coding-agent/src/core/session-manager.ts`
- `packages/coding-agent/src/modes/*`
- `packages/orchestrator/src/*`

## Generated Teaching Artifacts

- `course-map.html`
- `index.html`
- `chapters/*.html`
- `artifacts/source-matrix.md`
- `artifacts/misconception-audits/*.md`
- `proof/static-link-check.md`
- `proof/playwright-results.json`
- `proof/artifact-survival.json`

## Validation Tools

- `python3 /Users/charslee/.agents/skills/teach/scripts/check_manifest.py --manifest teach/manifest.json --base teach`
- `python3 /Users/charslee/.agents/skills/teach/scripts/check_source_matrix.py --matrix teach/artifacts/source-matrix.md`
- `python3 /Users/charslee/.agents/skills/teach/scripts/verify_html_artifacts.py --root teach`
- `python3 /Users/charslee/.agents/skills/teach/scripts/validate_teaching_workspace.py --workspace-root teach`
