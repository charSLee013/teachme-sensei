# Teachme Sensei

Teachme Sensei is a static GitHub Pages site for the Pi, Ideogram 4, Anima, FLUX.2, and LingBot-Video courses.

## Published truth

The committed `docs/` directory is the release truth. CI validates it directly and does not rebuild it from an external teaching package.

## Local checks

Install the exact locked toolchain with Node 22.23.1:

```sh
npm ci
npm run verify:public
npm run test:sync-fixture
npm run verify:workflow
npm run verify:artifacts -- --require-path scripts/public-site-manifest.json
npm run smoke:public
```

The smoke suite serves `docs/` over HTTP on port 4173 and checks both desktop and 390px Chromium routes.

## Optional source sync

Source sync is an explicit local operation. Set `TEACHING_SOURCE_ROOT` to a directory containing these package paths:

```text
anima_learning/
flux2/
ideogram4/paper-course/
ideogram4/assets/ideogram_logo.svg
lingbot-video-course/
pi/teach/
```

Check the committed output against the locked source bytes:

```sh
TEACHING_SOURCE_ROOT=/path/to/teaching-sources node scripts/sync-teaching-packages.mjs --check
```

To intentionally refresh the lock and generated course output, use `--write --update-lock`. The sync command stages and validates output before replacing only its owned paths.
