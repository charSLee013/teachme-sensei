# Feedback Regression Matrix

| feedback_id | student_feedback_summary | target_artifact | required_fix | gate | proof_status |
|---|---|---|---|---|---|
| F1 | Need arXiv-like rigor, abstract, evidence-backed conclusions, no personal voice. | `paper-course/index.html`, all pages | Technical-report structure, objective prose, visible claim/evidence/boundary boxes. | Abstract/scope/evidence/tone gate. | passed; subagent PASS |
| F2 | `run_inference.py` explanation must cover arguments, effects, defaults, failure modes. | `paper-course/02-cli-api-contract.html` | CLI/API contract table covering all argparse args. | Argparse coverage gate. | passed; missing args 0 |
| F3 | Main structure should be system categories, not folder responsibilities; module map needs links. | `paper-course/appendix/module-index.html` | System-layer clickable module index. | System-layer IA gate. | passed |
| F4 | Token packing needs serious 2D/3D visualization, not ASCII arrows. | `paper-course/03-token-packing.html` | 2D lanes and 3D token lattice with controls and fallback. | Interaction/render gate. | passed; subagent PASS; token-lattice-3d changed=true |
| F5 | Sampling/CFG needs visual explanation of conditioning per step. | `paper-course/04-sampling-cfg.html` | Vector/trajectory visualization with guidance control. | Interaction/render gate. | passed; sampling-cfg changed=true |
| F6 | Formula/pseudocode must define variables and whole/step computation. | `paper-course/04-sampling-cfg.html` | Variable table, equations, step interpretation before pseudocode. | Formula explanation gate. | passed |
| F8 | Model architecture chapter must be deep. | `paper-course/05-transformer-architecture.html` | Shape ledger, block flow, Qwen taps, MRoPE, AdaLN, invariants. | Architecture depth gate. | passed |
| F9 | Prompt JSON design needs semantics and comparison. | `paper-course/06-json-caption-protocol.html` | Schema semantics and bounded comparison with prompt paradigms. | Prompt protocol gate. | passed |
| F10 | Weight/runtime should be a model card. | `paper-course/01-model-card.html` | Model/runtime card with variants, params, I/O, hardware, safety, license, limits. | Model-card field gate. | passed |
| F11 | Training info needs positive public-information layering. | `paper-course/07-training-public-record.html` | Public claims/source facts/reconstruction/unknowns with positive scope language. | Training boundary gate. | passed; subagent PASS |
