# Misconception Audit: Ideogram 4 Inference-System Course

## Scope

- Artifact: `*.html`, `appendix/*.html`
- Intended learner: technical reader expecting a source-backed model/system course
- Mode: long-course + repo-course + evidence-backed technical course
- Date: 2026-06-29
- Reviewer: course quality gate

## Main-Line Restatement

1. This repository is an Ideogram 4 inference toolkit with model/runtime contracts, prompt protocol, sampler, quantized loading, and safety integration.
2. The core inference path packs Qwen3-VL text features and image latent tokens into one Transformer sequence, predicts velocities with conditional and image-only branches, and decodes final latents through a VAE.
3. Training information is handled as layered public record: public claims, source-supported inference behavior, course reconstruction, and details that are not publicly confirmed.

Result: `pass`

## Findings

| lens | likely_misunderstanding | why_it_happens | severity | required_fix | status |
|---|---|---|---|---|---|
| weak_reader | May treat 3D lattice as literal model geometry. | Visualization is schematic. | blocking | Page states 3D is schematic and includes 2D fallback. | fixed |
| evidence_prosecutor | May overread prompt paradigm comparison as competitor-specific claim. | Comparison table mentions other paradigms. | blocking | Page labels comparison as lineage context, not Ideogram internals. | fixed |
| course_architect | Course has many pages; route may feel heavy. | Evidence-backed depth requires multiple chapters. | non-blocking | Index provides reading order and cards. | tracked |
| skeptical_reader | May ask whether CLI argument table covers all args. | Manual tables can miss fields. | blocking | Argparse coverage script reports no missing args. | fixed |
| domain_reviewer | May ask whether training section guesses private training details. | Flow-matching reconstruction appears training-like. | blocking | Reconstruction is explicitly labeled and not-publicly-confirmed details are separated. | fixed |

## Gate Decision

- Verdict: `PASS`
- Blocking issues: none open before course review.
- Non-blocking suggestions: future v3 could add source line anchors into collapsed appendix.
- Follow-up owner: course maintainer.
