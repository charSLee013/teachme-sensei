# Misconception Audit #05: `lgtm` Is Not A Merge Vote Count

## The Misconception

The course taught that "each PR needs 2 LGTM to merge".

## Reality

**FALSE.** In this repository, `lgtm` is part of the contributor gate:

- `lgtmi`: future issues stay open
- `lgtm`: future issues and PRs stay open
- "Do not open a PR unless you have already been approved with `lgtm`"

That is a permission boundary for new contributors, not a fixed merge quorum.

## Source Evidence

- `CONTRIBUTING.md` - "Approval happens through maintainer replies on issues"
- `CONTRIBUTING.md` - "`lgtmi` does not grant rights to submit PRs. Only `lgtm` grants rights to submit PRs."
- `CONTRIBUTING.md` - "Do not open a PR unless you have already been approved with `lgtm`."

## Why This Happened

The earlier text imported a generic GitHub review mental model into a repo that uses a maintainer gate instead. That turned a workflow rule into a made-up vote threshold.

## Corrected In

- `chapters/14-contributing.html` quiz 1 now asks for the PR gate condition instead of an invented LGTM count.
- `chapters/14-contributing.html` learner cue now calls out this exact misread risk.
