# Static Link Check - Pi Agent Harness Repo Course

**Date**: 2026-07-02
**Scope**: `teach/index.html`, `teach/course-map.html`, and all `teach/chapters/*.html`
**HTML files checked**: 16

## Commands

```bash
python3 /Users/charslee/.agents/skills/teach/scripts/verify_html_artifacts.py --root teach
rg -n 'href="://|src="://' teach/index.html teach/course-map.html teach/chapters/*.html
rg -n 'href="[a-z]+://|src="[a-z]+://' teach/index.html teach/course-map.html teach/chapters/*.html
```

## Results

| Check | Result |
|---|---|
| Required learner cues, h1 count, viewport, and local link resolution | passed |
| Broken local HTML links | 0 |
| Malformed external URL schemes like `href="://..."` | 0 |
| Student-facing HTML files checked | 16 |

## External URLs Present

- `https://discord.com/invite/3cU7Bz4UPx`
- `https://github.com/earendil-works/pi`
- `https://github.com/earendil-works/pi/blob/main/CONTRIBUTING.md`
- `https://github.com/earendil-works/pi/blob/main/LICENSE`
- `https://keepachangelog.com/`
- `https://pi.dev`
- `https://rfc.earendil.com/keyword/pi/`
- `https://fonts.googleapis.com/css2?family=Inter...`

## Boundary

This proof validates local link integrity and external URL syntax. It does **not** ping external sites for reachability, rate limits, or future availability.
