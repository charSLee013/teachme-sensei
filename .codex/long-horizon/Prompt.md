# Prompt

## 项目概述

- 项目名称：teachme_sensei
- 冻结日期：2026-07-12
- 背景：这是一个发布到 GitHub Pages 的静态中文教学站，当前提交的 `docs/` 包含 Pi、Ideogram 4、Anima、FLUX.2 和 LingBot-Video 五个课程包，共 75 个 HTML 页面。
- 目标用户：需要直接阅读课程材料的工程师、模型工程师、研究读者和贡献者。

## 目标

- 清除公开页面中的后台治理/支撑层文案，修复已确认的错误内容、死链和伪造示例。
- 将 Pi 搜索改为覆盖全部 14 个章节的静态、可导航索引。
- 统一 75 个页面的 favicon、description、语言、标题、`main`、`h1` 和基础可访问性。
- 删除 FLUX.2 未引用的 9 个图片资源，并让公开资源由引用图约束。
- 在 GitHub Actions 中先执行静态验证和 Chromium smoke，再允许 Pages 部署。
- 将 source sync 改为显式 source root、SHA-256 lock、staging 和可复现 fixture 输入。

## 非目标

- 不把外部教学源包、后台 artifacts、proof、showcases 或 source matrix 纳入公开站点。
- 不在 CI 中重建外部源包；已提交 `docs/` 是发布真相。
- 不改写课程主题、视觉方向或已核实的技术事实，只修改明确的边界、模板、链接和生成规则。
- 不将普通学习资料外链当作 CDN 运行时依赖，也不承诺每个外部资料链接长期可达。

## 硬约束

- 性能：静态站点；公共页面不能因为搜索索引或 metadata 生成引入运行时网络依赖。
- 平台：GitHub Pages；本地 smoke 必须通过 HTTP server，不能用 `file://`。
- 依赖：Node 22.23.1；`@playwright/test` 1.55.0、`parse5` 7.2.1、`@axe-core/playwright` 4.10.2，精确版本和 transitive resolution 写入 lockfile；保留 CDN 但只允许显式 allowlist。
- 安全 / 合规：source root 不进入 CI；控制面不能保留 `/tmp` 默认路径；后台支持材料不能通过 HTML 或资源路径公开。
- 其他：任何 Phase 必须在本地验证通过且独立只读 reviewer 返回 `CONSENSUS` 后才能进入下一阶段。

## 交付物

- 主交付物：修复后的 `docs/`、`scripts/sync-teaching-packages.mjs`、公开站点验证器、Playwright smoke、GitHub Actions workflow。
- 过程文档：`.codex/long-horizon/Prompt.md`、`Plan.md`、`Implement.md`、`Documentation.md`。
- 额外 artifact：source lock、public route manifest、external dependency manifest、Pi search index、sync fixture、`package.json`/lockfile、Playwright failure reports。

## 完成标准

- 75/75 route 与固定 manifest 一致；本地链接、fragment、资产、脚本和页面结构全部通过。
- 无空 `href="#"`、无公开 support path、无伪造 issue/CVE 示例、无错误 Anima `.md` 可见标签。
- Pi 搜索从首页可定位并导航到第 10 章，索引 freshness hash 可由验证器独立重算。
- 每页都有统一 metadata、favicon、唯一 `h1` 和 `main`；代表页面没有 critical/serious axe 问题。
- FLUX.2 九个无用图片已删除，公开 binary 只保留被引用资源。
- source sync 在缺 root、冲突 root、lock mismatch 或验证失败时不改 docs；同一 fixture 双次输出逐文件 SHA-256 一致。
- CI 顺序为验证、测试、smoke、报告、部署；任一前置失败都不能 upload Pages。
- 结束前必须运行 `finalize_long_horizon_run.py`，并确认 manifest 与 artifact-survival report 存在。

## 演示路径

- 启动静态服务后打开 `/index.html`，确认目录页展示 LingBot-Video。
- 从 Pi 首页搜索 `compaction`，激活结果并确认到达 `/teach/pi/chapters/10-compaction.html`。
- 打开 LingBot course map，操作 hero 的 `下一步`、`重播`，确认 Canvas/diagram 状态变化。
- 在 Chromium 桌面和 390px 移动尺寸执行全量 route sweep。

## 关键问题与澄清

- 问题：公开产物和 source package 谁是发布真相？
  - 答案：已提交 `docs/` 是发布真相；source sync 只作为显式本地辅助流程，CI 不调用它。
- 问题：CDN 依赖是否全部本地化？
  - 答案：保留 CDN；`cdn.jsdelivr.net`、`fonts.googleapis.com`、`fonts.gstatic.com` 是唯一运行时 allowlist。数学/Canvas/OGL 依赖失败硬阻断，字体失败只 warning 且必须有 fallback。
- 问题：如何避免 sync 覆盖手工修复？
  - 答案：源包修复必须进入确定性 postprocess；sync 先在临时 staging 构建并验证，再只替换 sync-owned 路径，失败时 rollback。
- 问题：如何定义 reproducible input？
  - 答案：source lock schema 1 记录固定相对路径、文件集合、大小和原始字节 SHA-256；缺源或 lock mismatch 失败，fixture 双次构建必须逐文件一致。

## 可执行接口契约

### Sync CLI 与退出码

- 必须且只能提供一个模式：`--check` 或 `--write`；缺失、重复、同时提供或未知参数时退出 `2`。`--source-root`、`--source-lock`、`--output-root` 每个最多出现一次；参数值缺失时退出 `2`。
- `--source-root PATH` 与 `TEACHING_SOURCE_ROOT` 都存在时，先对两个原始参数逐级 `lstat`；任何原始参数或其父路径是符号链接都退出 `2`，然后对两个已确认的普通目录执行 `realpath`，相同则继续，不同退出 `2`。只有一个存在时使用它；都不存在退出 `2`。该顺序固定，不能先 realpath 再丢失 symlink 证据。
- source root 必须解析为存在、可读且非符号链接的目录；非目录、不可读目录、重复 `--source-root` 或任一 source package 缺失时退出 `2`。所有被 include 选中的目录、文件和中间父目录也必须是普通路径；遇到符号链接、路径穿越或 include 重叠时退出 `2`。
- `--source-lock PATH` 优先于 `TEACHING_SOURCE_LOCK`，再回退到仓库内 `scripts/teaching-source-lock.json`；lock 缺失、不可读、JSON 无法解析或 schema 不为 `1` 时退出 `2`。
- `--output-root PATH` 默认是仓库内的 `docs/`；相对参数按仓库根解析，绝对参数先 `realpath` 父目录。目标必须已经存在、是可写普通目录且不能是仓库根或 source root；`--check` 与 `--write` 都不自动创建或清空 output root。
- `--check` 在系统临时目录下的 `teachme-sync-*/stage` 构建，验证完成后逐字节比较 output root 内的 sync-owned 路径；`--write` 使用同样 staging，验证成功后才进入替换事务。
- 替换事务固定为：记录 sync-owned 路径的旧状态 -> 将旧路径按深度从深到浅 rename 到临时 backup -> 将 stage 路径按深度从浅到深 rename 到 output root -> 最后原子替换 lock 临时文件。任一步失败，按相反顺序删除新路径并将 backup rename 回原路径；验证失败发生在事务前，output root 和 lock 均保持不变。事务完成后删除 backup；删除 backup 失败也算失败并执行同一回滚。其他 docs 文件绝不参与事务。
- `--update-lock` 必须与 `--write` 同时提供；只在 source layout、whitelist、staging 内容和静态验证全部成功后写入 lock。lock 写入失败时按上述事务顺序恢复旧 lock 和旧 docs。`--write` 未带 `--update-lock` 不会改变 lock；写入的新 lock 必须与 stage 的实际文件集合一致。
- 成功退出 `0`；`--check` 发现 committed docs 与 staging 不同、生成验证失败或原子替换失败退出 `1`；CLI、source layout、路径安全或 lock 输入错误退出 `2`。
- staging 固定使用系统临时目录下的 `teachme-sync-*`，退出前尽力删除但不把临时目录内容发布；sync-owned 路径固定为 `docs/.nojekyll`、`docs/teach/assets/ideogram_logo.svg`、`docs/teach/assets/favicon.svg` 和 `docs/teach/{pi,ideogram4,lingbot-video,flux2,anima}/`。其他 docs 文件不删除、不替换。

### Source lock schema 1

```json
{
  "schema": 1,
  "hashAlgorithm": "sha256-raw-bytes",
  "pathEncoding": "posix-relative",
  "packages": [
    {
      "id": "pi",
      "sourcePath": "pi/teach",
      "outputPath": "teach/pi",
      "include": ["index.html", "course-map.html", "assets/", "chapters/"],
      "files": [{"path": "index.html", "bytes": 0, "sha256": "..."}],
      "treeSha256": "..."
    }
  ],
  "sharedFiles": [{"id": "ideogram-logo", "sourcePath": "ideogram4/assets/ideogram_logo.svg", "outputPath": "teach/assets/ideogram_logo.svg", "bytes": 0, "sha256": "..."}],
  "sharedTreeSha256": "..."
}
```

- 顶层只允许 `schema`、`hashAlgorithm`、`pathEncoding`、`packages`、`sharedFiles`、`sharedTreeSha256`；类型分别为整数、固定字符串、固定字符串、对象数组、对象数组、64 位小写十六进制字符串。package 对象只允许 `id`、`sourcePath`、`outputPath`、`include`、`files`、`treeSha256`；shared file 对象只允许 `id`、`sourcePath`、`outputPath`、`bytes`、`sha256`。必填字段不得为空，id/path 不得重复，所有路径必须是 POSIX 相对路径且不得包含 `..`、反斜杠或 NUL。
- `packages` 顺序按 `id` 字典序；每个 `include` 是唯一的普通文件路径或以 `/` 结尾的目录选择器，目录选择器递归展开普通文件，include 和展开后的 `files[].path` 均按字典序；include 不得互相覆盖。`sourcePath` 相对 source root，`outputPath` 相对 output root，shared file 的源路径也相对 source root；不记录 lock 自身。
- 每个 `files[].sha256` 是该文件原始字节的 SHA-256，`bytes` 是原始字节数；不做换行、权限或编码归一化；符号链接输入直接退出 `2`。文件必须是 regular file，目录、FIFO、设备文件和不可读文件均退出 `2`。
- `treeSha256` 是对该 package `files` 按路径排序后，以 UTF-8 行 `${path}\0${sha256}\n` 逐行拼接计算的 SHA-256。`sharedTreeSha256` 对 `sharedFiles` 按 `outputPath` 排序使用相同规则单独计算，不把 package 与 sharedFiles 混合。
- 实际 source lock 的五个 package records 固定为（按 id 字典序）：`anima` sourcePath `anima_learning` -> outputPath `teach/anima`；`flux2` sourcePath `flux2` -> outputPath `teach/flux2`；`ideogram4` sourcePath `ideogram4/paper-course` -> outputPath `teach/ideogram4`；`lingbot-video` sourcePath `lingbot-video-course` -> outputPath `teach/lingbot-video`；`pi` sourcePath `pi/teach` -> outputPath `teach/pi`。另有 shared file id `ideogram-logo` sourcePath `ideogram4/assets/ideogram_logo.svg` -> outputPath `teach/assets/ideogram_logo.svg`。固定 include 为：Pi 的 `index.html`、`course-map.html`、`assets/`、`chapters/`；Ideogram 的 `index.html`、`paper.css`、`paper.js`、`01-model-card.html`、`02-cli-api-contract.html`、`03-token-packing.html`、`04-sampling-cfg.html`、`05-transformer-architecture.html`、`06-json-caption-protocol.html`、`07-training-public-record.html`、`appendix/evidence.html`、`appendix/module-index.html`；LingBot 的 `index.html`、`lessons/`、`reference/`、`assets/course.css`、`assets/course-runtime.js`、`assets/page-configs.js`、`assets/ogl-bridge.js`（不复制包内 favicon）；FLUX.2 的 `course-map.html`、`lessons/`、`reference/0001-flux2-training-glossary.html`、`reference/0002-flux2-latent-contract-map.html`、`reference/0003-training-gap-checklist.html`、`reference/0004-model-family-and-license-matrix.html`、`reference/0005-object-and-contract-quick-reference.html`、`reference/0006-research-route-decision-tree.html`（不复制 `assets/`）；Anima 的 `README.md`、`course-map.md`、`lessons/`、`reference/`。目录 include 只展开普通文件，package 顺序固定为上述 id 字典序。
- lock 只覆盖上述 source whitelist 可能进入公开产物的文件；`artifacts`、`proof`、`showcases`、`.git`、`.codex`、`schemas` 等排除目录不进入 lock。lock 的 schema、字段集合、实际源布局、白名单和当前文件 hash 必须在 `--check` 中全部重新计算并比较。`.nojekyll` 是固定零字节生成文件，`teach/assets/favicon.svg` 来自仓库内 `scripts/canonical-favicon.svg` 的原始字节，二者不伪装成 source package 文件；source postprocess 固定执行支持文案清除、课程入口补链、Pi/Anima 文案修正、metadata/favicons/search-index 生成和 FLUX binary prune，规则写在 `scripts/sync-teaching-packages.mjs`，不得依赖 source 包的 artifacts/proof 文件。

### Pi index、public manifest 与 CDN manifest

- Pi index 路径固定为 `docs/teach/pi/assets/js/search-index.js`，文件只执行 `window.PI_SEARCH_INDEX = <JSON>;` 一次，JSON 对象只允许 `schema`、`sourceHashAlgorithm`、`sourceHash`、`sourceFiles`、`entries`；固定值为 `schema: 1`、`sourceHashAlgorithm: "sha256-path-nul-raw-newline"`。`sourceFiles` 为 14 个 chapter 路径，`entries` 必须与其一一对应并按 `sourceFiles` 顺序排列；entry 只允许 `title`、`href`、`snippet`、`searchText`，四者均为非空字符串，`href` 必须是从 `teach/pi/` 根解析的页面相对路径且目标存在。
- `sourceFiles` 是 `chapters/*.html` 的完整 14 项字典序集合；hash 输入是每个 `path + NUL + raw bytes + newline` 的 UTF-8/字节串联，算法是 SHA-256；不包含 search-index 自身。`title` 取该章唯一 h1 的归一化文本，`snippet` 取 body 可见文本去除空白后的前 180 个 Unicode code points，`searchText` 保存同一份完整可见正文供浏览器本地搜索，禁止通过 fetch 引入运行时搜索网络依赖；验证器独立重算，缺章、额外章、entry 顺序、目标、title/snippet/searchText 或 hash 任一不符退出 `1`。
- public manifest schema 固定为 `1`，顶层只允许 `schema`、`htmlRoutes`、`entryRoutes`、`assetAllowlist`、`binaryAllowlist`、`syncOwnedPaths`、`orphanRoots`、`interactionCases`。`htmlRoutes` 是本次冻结的 75 个不带前导 `/` 的字典序文件路径，数组不允许重复；`entryRoutes` 是 `{route, course, kind}` 对象数组，`course`/`kind` 为非空字符串且 route 必须属于 htmlRoutes；`assetAllowlist`、`binaryAllowlist`、`syncOwnedPaths` 是不带前导 `/` 的字典序 glob/path 字符串数组；`orphanRoots` 是 `{root, expectedLinks, allowedFiles}` 数组，三个字段均为排序后的路径数组或字符串；`interactionCases` 是 `{id, route, selector, action, expected}` 数组，字段均为非空字符串且 route 属于 htmlRoutes。所有顶层和对象均禁止 additional properties。
- validator 只读 manifest，不生成、不排序回写或更新它：实际 HTML 集合必须与 `htmlRoutes` 完全相等；每个本地资产必须匹配 assetAllowlist，binary 必须匹配 binaryAllowlist；每个 declared entry、sync-owned path、orphan root、interaction route 和 selector/action 都必须可解析。orphanRoots 中的 `allowedFiles` 是有意未被 HTML 引用的文件，除此之外未被引用的页面/资产失败。
- 本次冻结的 `htmlRoutes` 为：

```text
index.html
teach/anima/course-map.html
teach/anima/index.html
teach/anima/lessons/01-what-is-anima.html
teach/anima/lessons/02-architecture.html
teach/anima/lessons/03-training-boundaries.html
teach/anima/lessons/04-prompting.html
teach/anima/lessons/05-evaluation.html
teach/anima/reference/formulas.html
teach/anima/reference/methodology.html
teach/anima/reference/resources.html
teach/flux2/course-map.html
teach/flux2/index.html
teach/flux2/lessons/0001-find-the-latent-contract.html
teach/flux2/lessons/0002-map-the-training-gaps.html
teach/flux2/lessons/0003-flux2-system-masterclass.html
teach/flux2/lessons/0004-pick-your-first-research-path.html
teach/flux2/lessons/0005-cli-and-end-to-end-flow.html
teach/flux2/lessons/0006-four-core-objects.html
teach/flux2/lessons/0007-autoencoder-and-latent-representation.html
teach/flux2/lessons/0008-sampler-schedule-and-cfg.html
teach/flux2/lessons/0009-transformer-streams-and-kv-cache.html
teach/flux2/lessons/0010-model-family-licenses-and-boundaries.html
teach/flux2/lessons/0011-evidence-boundaries.html
teach/flux2/lessons/0012-from-repo-understanding-to-training-fork.html
teach/flux2/reference/0001-flux2-training-glossary.html
teach/flux2/reference/0002-flux2-latent-contract-map.html
teach/flux2/reference/0003-training-gap-checklist.html
teach/flux2/reference/0004-model-family-and-license-matrix.html
teach/flux2/reference/0005-object-and-contract-quick-reference.html
teach/flux2/reference/0006-research-route-decision-tree.html
teach/ideogram4/01-model-card.html
teach/ideogram4/02-cli-api-contract.html
teach/ideogram4/03-token-packing.html
teach/ideogram4/04-sampling-cfg.html
teach/ideogram4/05-transformer-architecture.html
teach/ideogram4/06-json-caption-protocol.html
teach/ideogram4/07-training-public-record.html
teach/ideogram4/appendix/evidence.html
teach/ideogram4/appendix/module-index.html
teach/ideogram4/index.html
teach/index.html
teach/lingbot-video/index.html
teach/lingbot-video/lessons/01-system-map.html
teach/lingbot-video/lessons/02-public-workflow.html
teach/lingbot-video/lessons/03-prompt-rewriter-and-negative.html
teach/lingbot-video/lessons/04-runner-orchestration.html
teach/lingbot-video/lessons/05-diffusion-pipeline-loop.html
teach/lingbot-video/lessons/06-ti2v-conditioning.html
teach/lingbot-video/lessons/07-transformer-single-stream.html
teach/lingbot-video/lessons/08-sparse-moe.html
teach/lingbot-video/lessons/09-refiner.html
teach/lingbot-video/lessons/10-serving-fsdp-sglang.html
teach/lingbot-video/lessons/11-debugging-and-validation.html
teach/lingbot-video/reference/cli-arguments.html
teach/lingbot-video/reference/environment-variables.html
teach/lingbot-video/reference/evidence-boundaries.html
teach/lingbot-video/reference/file-map.html
teach/lingbot-video/reference/model-and-paper-claims.html
teach/pi/chapters/01-what-is-pi.html
teach/pi/chapters/02-monorepo.html
teach/pi/chapters/03-pi-ai.html
teach/pi/chapters/04-agent-core.html
teach/pi/chapters/05-pi-tui.html
teach/pi/chapters/06-coding-agent.html
teach/pi/chapters/07-tools.html
teach/pi/chapters/08-extensions.html
teach/pi/chapters/09-session-management.html
teach/pi/chapters/10-compaction.html
teach/pi/chapters/11-interactive-mode.html
teach/pi/chapters/12-sdk.html
teach/pi/chapters/13-orchestrator.html
teach/pi/chapters/14-contributing.html
teach/pi/course-map.html
teach/pi/index.html
```
- external dependency manifest schema 固定为 `1`，顶层只允许 `schema`、`allowedRuntimeHosts`、`allowedReferenceHosts`、`dependencies`；host 数组和 dependency 数组按字典序且不重复。每个 dependency 只允许 `id`、`type`、`urls`、`requiredBy`、`failure`：id 非空，type 只能为 `runtime` 或 `reference`，urls 是完整绝对 URL 数组，requiredBy 是不带前导 `/` 的 route/script/glob 数组，failure 只能为 `hard` 或 `warning`。runtime dependency 的每个 URL 必须命中 allowedRuntimeHosts；reference dependency 的 URL 只做语法和 host 检查。
- 当前 runtime records 固定为：`katex-0.16.9`（urls `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css`、`https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js`、`https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js`，requiredBy `teach/lingbot-video/lessons/*.html`，hard）、`ogl-1.0.11`（url `https://cdn.jsdelivr.net/npm/ogl@1.0.11/+esm`，requiredBy `teach/lingbot-video/assets/ogl-bridge.js`，hard）、`mathjax-3`（url `https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js`，requiredBy `teach/flux2/lessons/0003-flux2-system-masterclass.html`，hard）、`three-0.167.1`（url `https://cdn.jsdelivr.net/npm/three@0.167.1/build/three.module.js`，同一 route，hard）和 `google-fonts-inter-jetbrains`（urls `https://fonts.googleapis.com`、`https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap`，requiredBy Pi chapters 06/09/10/11/12/13/14，warning）。当前 reference records 固定为两个对象：`flux-references`（urls `https://bfl.ai/research/representation-comparison`、`https://bfl.ai/blog/flux2-klein-towards-interactive-visual-intelligence`、`https://github.com/black-forest-labs/flux2`、`https://github.com/black-forest-labs/flux2/issues`、`https://github.com/huggingface/diffusers/discussions`、`https://huggingface.co/blog/flux-2`、`https://huggingface.co/black-forest-labs/FLUX.2-dev`，requiredBy `teach/flux2/**/*.html`，warning）和 `pi-references`（urls `https://github.com/earendil-works/pi`、`https://github.com/earendil-works/pi/blob/main/LICENSE`、`https://pi.dev`、`https://discord.com/invite/3cU7Bz4UPx`、`https://keepachangelog.com/`、`https://rfc.earendil.com/keyword/pi/`、`https://radius.pi.dev/`，requiredBy `teach/pi/**/*.html`，warning）。当前 reference host allowlist 固定为 `bfl.ai`、`github.com`、`huggingface.co`、`discord.com`、`keepachangelog.com`、`rfc.earendil.com`、`pi.dev`、`radius.pi.dev`；现有 `<a>` URL 必须全部命中这些 host 或同站相对路径。
- runtime allowlist 只有 `cdn.jsdelivr.net`、`fonts.googleapis.com`、`fonts.gstatic.com`；扫描 `script[src]`、`link[href]`、`img[src]`、`source[src]`、`iframe[src]`、`object[data]`、`video/audio[src]`、`modulepreload[href]` 和 JS 静态/动态 import URL。Google Fonts failure 只 warning，但相应 CSS 必须有本地 system-font fallback；数学/Canvas/OGL 的 required URL 失败为 hard。普通 `<a>` 资料链接使用独立 reference host allowlist，不被 smoke 当作可执行资源下载。
- 网络失败判定固定为：最终响应 HTTP status 必须为 200-299；允许最多 1 次、间隔 250 ms 的相同 URL 重试；每次请求 timeout 10,000 ms；重定向的每一跳 host 都必须在对应 allowlist，最终响应仍按 2xx 判定。required runtime 的 timeout、非 2xx、DNS/TLS、脚本 parse/import error、KaTeX/MathJax 未完成初始化、OGL import error 或 LingBot Canvas 在交互后像素仍全透明均为 hard；Google Fonts 的同类失败只 warning，并由本地 system font fallback 接管。reference URL 不参与 smoke 网络 gate，只做 URL/host 语法检查。

public manifest 的非 route inventory 也冻结为以下 exact values（路径相对 `docs/`，数组按字典序）：

```json
{
  "entryRoutes": [
    {"route":"index.html","course":"portal","kind":"portal"},
    {"route":"teach/anima/course-map.html","course":"anima","kind":"map"},
    {"route":"teach/anima/index.html","course":"anima","kind":"course"},
    {"route":"teach/flux2/course-map.html","course":"flux2","kind":"map"},
    {"route":"teach/flux2/index.html","course":"flux2","kind":"course"},
    {"route":"teach/ideogram4/index.html","course":"ideogram4","kind":"course"},
    {"route":"teach/index.html","course":"catalog","kind":"catalog"},
    {"route":"teach/lingbot-video/index.html","course":"lingbot-video","kind":"course"},
    {"route":"teach/pi/course-map.html","course":"pi","kind":"map"},
    {"route":"teach/pi/index.html","course":"pi","kind":"course"}
  ],
  "assetAllowlist": [
    "teach/anima/anima.css",
    "teach/home.css",
    "teach/ideogram4/paper.css",
    "teach/ideogram4/paper.js",
    "teach/lingbot-video/assets/course-runtime.js",
    "teach/lingbot-video/assets/course.css",
    "teach/lingbot-video/assets/ogl-bridge.js",
    "teach/lingbot-video/assets/page-configs.js",
    "teach/pi/assets/js/app.js",
    "teach/pi/assets/js/search-index.js",
    "teach/pi/assets/style.css",
    "teach/assets/favicon.svg",
    "teach/assets/ideogram_logo.svg"
  ],
  "binaryAllowlist": [],
  "syncOwnedPaths": [
    ".nojekyll",
    "teach/anima/",
    "teach/assets/favicon.svg",
    "teach/assets/ideogram_logo.svg",
    "teach/flux2/",
    "teach/ideogram4/",
    "teach/lingbot-video/",
    "teach/pi/"
  ],
  "orphanRoots": [
    {"root":"teach/flux2/assets","expectedLinks":[],"allowedFiles":[]}
  ],
  "interactionCases": [
    {"id":"lingbot-next","route":"teach/lingbot-video/index.html","selector":"[data-action=next]","action":"click","expected":"canvas-pixel-hash changes"},
    {"id":"lingbot-replay","route":"teach/lingbot-video/index.html","selector":"[data-action=replay]","action":"click","expected":"canvas-pixel-hash changes; step index returns to 0"},
    {"id":"pi-search-compaction","route":"teach/pi/index.html","selector":"#searchInput","action":"fill:compaction then click result[href=chapters/10-compaction.html]","expected":"location:teach/pi/chapters/10-compaction.html"}
  ]
}
```

### Visible-text 与 control-plane 扫描

- 用 parse5 解析完整 HTML；visible text 根是 `<body>`，若 body 缺失则根为 document。递归排除 `head`、`script`、`style`、`template`、`pre`、`code`、`noscript`、`textarea`、`option` 和整个 `svg` 子树（因此也排除 `foreignObject`）；再排除带 `hidden`/`inert`、`aria-hidden="true"` 或 inline style 含 `display:none`/`visibility:hidden` 的节点及其子树。parse5 已完成 HTML entity 解码；输出统一把连续 Unicode whitespace 折叠为一个 ASCII 空格并 trim。`aria-*`、`title`、`meta`、JSON-LD 不算 visible text，但控件 label（`label` 文本、`aria-label`、关联 `label[for]`）另做可访问性检查。
- support path 只要出现在 `href`、`src`、`action` 或 `data-*` 属性就失败；可见文案禁用 `source matrix`、`repo truth map`、`support-layer`、`proof/`、`artifacts/`、`showcases/` 等后台引用。合法课程技术词不因同名通用词被全局删除。
- 伪造 `issue #1234`、`CVE-2024-xxxxx` 和空 `href="#"` 在完整 HTML 中扫描，包括 code/pre；合法的非空 fragment 必须在目标页面存在 id。
- `/tmp` 只在 control-plane 文件 `scripts/`、`.github/`、`README.md`、`package*.json`、`.nvmrc` 和两个 JSON manifest 中禁止；课程 code/pre 示例不在该扫描范围。

### Phase reviewer payload

每个 reviewer 必须收到下面的实际值，不能只收到“审查本阶段”：

```text
Phase Goal: 当前 Phase 的一条可验证目标
File Boundary: 允许读取/修改的完整路径或 glob 清单
Review Focus: 当前 Phase 的风险与禁止回归
Verification: 必须执行的命令和预期结果
Non-goals: 明确不能修改的文件/行为
```

## 备注

## 2026-07-14 Krea2 扩展规格

### 目标

- 将 `/private/tmp/kera2-course/` 作为第六个教学源包纳入确定性同步流程，在 `docs/teach/krea2/` 发布 37 个 HTML 路由和 1 个 CSS 资产，使公开路由总数从 75 增至 112。
- 保留 28 个 lesson、6 个 reference 和 course map；新增课程入口与面向读者的 evidence-and-sources 页面。
- 把 9 份结构化 source Markdown 汇总成公开 HTML。`MISSION.md` 与 `review.md` 仅用于源包治理，不进入公开目录。
- 将代码引用固定到 Krea 官方仓库 revision `cf3c9102c924168699b90d97a2cb15059d761488`，并校验路径与行号上界。
- 全面改写 Krea2 公开可见文本中的否定对照套式，改用范围、条件、证据和结果的正向陈述；必要的风险与限制必须保留。

### 输入与输出契约

- package id：`krea2`；sourcePath：`kera2-course`；outputPath：`teach/krea2`。
- 输入白名单固定为 `course-map.html`、`assets/course.css`、`lessons/`、`reference/`、`sources/`，共 45 个普通文件。目录、父目录和文件均拒绝符号链接；额外源文件不进入 lock 或输出。
- 输出固定为 `index.html`、`course-map.html`、28 个 `lessons/*.html`、6 个原始 `reference/*.html`、`reference/evidence-and-sources.html`、`assets/course.css`。
- `scripts/course-adapters/krea2.mjs` 暴露 `buildKrea2Course({ packageRoot, outputRoot })`。主同步器只负责 lock、staging、事务和适配器调度，其余五个课程适配流程保持现状。
- 9 个 source 文件必须满足 H1 和 `Source`、`What It Supports`、`Teaching Use`、`Scope` 四节结构；缺节、重节、空节或未知结构都使 staging 失败。
- Krea2 HTML 禁止 `<script>`，禁止 `.md` href、越出 package 的相对链接、公开 `MISSION.md`/`review.md`/`sources/` 路径和未解析 Markdown 语法。
- Krea2 CSS 保留源样式，并由适配器加入确定性的 focus-visible 与窄屏 overflow 保护。

### 内容约束

- 公开可见文本禁止 `not X ... but Y`、`not part of`、`does not require`、`do not require`、`not treated as` 及其变体。
- 公开可见中文禁止 `不是 X 而是 Y`、`并非 X 而是 Y`、`不只是 X 而是 Y`、`不等于` 等否定对照模板；涉及风险时直接写明适用范围、先决条件、证据强度和失败后果。
- 文案修订必须由适配器内的确定性规则完成。每条精确替换记录原文、改写文本和预期次数；原文漂移或次数变化使构建失败。
- `autoencoder.py` 引用行号上界按固定 revision 的 22 行校正；课程中两处原始 Markdown 链接转向聚合证据页。
- 无公开实测支撑的 H100 表述改为硬件规划提示，不写成已经完成的基准结论。

### 验收标准

- public manifest 与 `docs/` 精确匹配 112 个 HTML；Krea2 的 37 页均具有 description、favicon、唯一 main、唯一 h1、合法 heading 顺序和可解析本地链接。
- source lock 包含 Krea2 的 45 个输入文件；缺文件、schema 破坏、hash 漂移、输出差异、两次构建不一致均失败且不改 committed docs。
- 静态验证证明 Krea2 没有脚本、原始 Markdown、治理路径、package escape、禁用文案套式和孤儿页面。
- Playwright 在 112 个路由的 desktop 与 390px mobile 视口完成加载、样式响应和水平溢出检查；Krea2 details 可交互，代表页 axe 无 critical/serious 问题。
- 本地资源和 required runtime 失败为 hard failure；Google Fonts 等 optional 字体失败仅记录 warning，页面 console 不重复把同一可选网络失败升级为 hard failure。
- `npm test` 与 CI static job都包含 workflow verifier；CI 仍只验证 committed `docs/`，不访问本机 source root。

- 本文件是冻结后的规格说明；如需扩 scope，先更新本文件再更新 `Plan.md`。
- 不允许在收尾阶段删除主交付物或 `Documentation.md`。
