# Teachme Sensei

Teachme Sensei is a static GitHub Pages site for the Pi, Ideogram 4, Anima, FLUX.2, LingBot-Video, and Krea 2 courses.

## Published Truth

The committed `docs/` directory is the release truth. The Pages workflow uploads that directory and deploys it directly.

## Local Development

Use Node 22.23.1 and install the locked dependencies:

```sh
npm ci
npm test
```

`npm test` runs the Krea adapter tests, deterministic sync fixture, 112-route static site validator, and single-job Pages workflow contract.

When a page or interaction changes, open the affected page during development and inspect its desktop and narrow-screen behavior directly.

## Pages Deployment

A push to `master` runs `.github/workflows/pages.yml`:

```text
checkout -> configure Pages -> upload docs -> deploy
```

The workflow contains one `deploy` job and publishes one Pages artifact.

## Optional Source Sync

Source sync is an explicit local operation. Set `TEACHING_SOURCE_ROOT` to a directory containing these package paths:

```text
anima_learning/
flux2/
ideogram4/paper-course/
ideogram4/assets/ideogram_logo.svg
kera2-course/
lingbot-video-course/
pi/teach/
```

Check the committed output against the locked source bytes:

```sh
TEACHING_SOURCE_ROOT=/path/to/teaching-sources node scripts/sync-teaching-packages.mjs --check
```

To refresh the lock and generated course output intentionally, use `--write --update-lock`. The sync command stages and validates output before replacing its owned paths.
