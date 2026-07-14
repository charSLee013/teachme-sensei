# Plan

## 计划摘要

- 目标：按 Prompt 中的七个实现面修复公开教学站，并建立可阻断错误发布的静态/浏览器/同步验证回路。
- 当前阶段：M6，公开产物与双视口浏览器证明已完成，进入最终 artifact proof 与提交。
- 发布真相：提交到 `docs/` 的产物。

## 架构意图

```text
source root + lock -> isolated staging -> deterministic postprocess -> sync-owned docs
                                                        |
committed docs -> public manifest/static verify -> Chromium smoke -> Pages deploy
```

- 课程包生成规则必须与提交产物分离：source sync 可选，CI 只验证提交产物。
- 任何源包页面修复必须由 sanitizer/postprocess 生成，避免 `cleanDir` 后丢失。
- public manifest 是手工审核的 route 真相，不能由当前 `docs` 自我生成。
- Pi search index hash 只依赖最终 14 个 chapter HTML，不依赖自身。
- CDN 可执行依赖和普通学习资料链接分开验证。

## Finding-to-Phase 映射

| ID | 已确认病灶 | Phase | 关闭证据 |
|---|---|---|---|
| F01 | 目录暴露 proof/source matrix/support-layer 文案 | 1 | visible-text scan + reviewer |
| F02 | LingBot source matrix、SGLang 语义冲突、两个 reference 孤儿页 | 1 | occurrence scan + route graph |
| F03 | Pi 空 `#` 链接、伪造 issue/CVE、Anima `.md` 标签 | 1 | static link/content scan |
| F04 | Pi 搜索只扫描当前 DOM，点击不能跨页 | 2 | static index + Playwright navigation |
| F05 | description、favicon、main、contrast、heading 层级缺口 | 3 | HTML contract + axe/contrast |
| F06 | FLUX.2 九个无用图片、index/course-map 重复 | 4/3 | asset graph + byte comparison |
| F07 | sync 硬编码 `/tmp`，先清目录，手工修复会丢 | 5 | lock/fixture/rollback tests |
| F08 | workflow 直接 upload，没有验证 | 6 | workflow order + failed-gate test |
| F09 | CDN 和普通外链没有分层失败语义 | 6 | dependency manifest + network smoke |
| F10 | 没有固定 route/asset manifest | 6 | manifest equality check |

## 里程碑

### M1 - 冻结规格与验证回路

- 目标：创建并校验四份 long-horizon 文档，固定 findings、文件边界、source lock、CDN 和 reviewer 契约。
- 验收标准：Prompt 无待补充项；Plan 有 finding matrix；工作树没有非任务修改且四份 `.codex/long-horizon/*.md` 已创建并通过 validator；Planning Council 复审返回 `CONSENSUS` 后才进入内容实现。
- 验证命令：`python3 /Users/charslee/.agents/skills/long-horizon-runner/scripts/validate_long_horizon_docs.py --target .`、`git diff --check`、`git status --short`。
- 风险：当前独立 council 已两次返回 `NEEDS_REVISION`；执行前必须重新审查修订后的具体接口。

### M2 - 核心执行与证据沉淀

- 目标：完成 Phase 1-6 的代码、HTML、资源、sync、验证器、Playwright 和 workflow 实现。
- 验收标准：每个子里程碑本地测试通过；独立 reviewer 使用明确 payload 返回 `CONSENSUS`；失败不得推进。
- 验证命令：`npm run verify:public`、`npm run test:sync-fixture`、`npm run smoke:public`、`node --check`、`git diff --check`。
- 风险：批量 HTML 修改可能误伤合法代码示例；扫描必须区分 visible text、code/pre、script/style 和 control-plane。

### M3 - 收口与最终证明

- 目标：全量静态验证、Chrome MCP/Playwright proof、独立 final review、artifact survival、提交。
- 验收标准：75 条 route 全部通过；validate job 成功后才可部署；最终 reviewer `CONSENSUS`；finalizer 生成 manifest 和 survival report。
- 验证命令：`npm test`、`npm run verify:public`、`npm run smoke:public`、Chrome HTTP route sweep、`finalize_long_horizon_run.py`。
- 风险：CDN 或 Chrome MCP 环境故障只能记录为明确的 `SKIPPED`/fallback，不得写成通过。

## Stop-and-fix 规则

- 任一里程碑验证失败时，先修复并重新验证，再继续后续工作。
- Phase reviewer 未返回 `CONSENSUS` 时，停留在当前 Phase；边界外文件或缺验证证据直接 `NEEDS_REVISION`。
- 若关键工作文档、manifest、lock、search index 或主交付物消失，立即停止并判定本次运行失败。
- 不使用 destructive git 命令；保留用户或其他 agent 的现有修改。

## 最终收口

- 先把 `Documentation.md` 更新到真实最终状态并填写 `## 最终验证证据`。
- 再运行 `finalize_long_horizon_run.py`，要求四份工作文档和所有主 artifact 存在。
- 只有 finalizer 成功、manifest 和 artifact-survival report 均通过，才能声明运行成功。

## 决策记录

- 决策：`docs/` 是发布真相，CI 不调用 sync。
  - 原因：外部 source package 不在仓库内，CI 重建既不可复现又会覆盖提交内容。
- 决策：保留 CDN，但 executable CDN 使用 required/optional 分级。
  - 原因：用户选择保留 CDN；必须把网络不稳定与页面本地错误区分开。
- 决策：`--source-root` 优先于 `TEACHING_SOURCE_ROOT`，冲突时失败。
  - 原因：静默选择不同 source 会产生不可审计的输出。

## 未决问题

- 无产品决策未决；若实现发现源包布局与冻结布局不同，暂停并更新 Prompt/Plan 后再继续。

## Krea2 扩展里程碑

### M4 - 适配器与确定性内容转换

- 目标：新增深模块 `scripts/course-adapters/krea2.mjs`，接入 source lock、staging 和 sync-owned transaction；生成课程入口、聚合证据页及 35 个转换页面。
- 验收标准：45 个白名单输入可重建 37 个 HTML 和 1 个 CSS；源结构、source schema、固定 revision 链接、精确文案替换和零脚本约束任一漂移都会失败。
- 验证：适配器单测、`node --check`、fixture 缺文件/坏 schema/lock mismatch/double hash、`git diff --check`。
- 风险反例：源包多一个无关文件不得进入输出；source 标题缺一节不得生成半成品；旧行号超出固定 revision 必须在 staging 被拦截。

### M5 - 公开契约与回归门禁

- 目标：将 public manifest 扩展到 112 路由，完善静态验证、外部依赖、Playwright、workflow verifier 和 CI static gate。
- 验收标准：实际 route/asset 集合与 manifest 完全一致；Krea2 无治理路径、Markdown 泄漏、越界链接、禁用文案或脚本；可选字体断网保持 warning，站内资源和 required runtime 失败保持 hard failure。
- 验证：`npm run verify:public`、`npm run verify:workflow`、`npm run test:sync-fixture`、全部 JS `node --check`。
- 风险反例：浏览器将 Google Fonts 的 console load error 二次记为页面失败；manifest route 数写成魔法常量；窄屏的长 URL 或 code 块触发水平滚动。

### M6 - 公开产物、浏览器证明与提交

- 目标：通过显式 source root 更新 lock 与 committed docs，完成 112 route 双视口、Krea2 interaction/axe、全量测试、只读 review、artifact survival 和提交。
- 验收标准：`--check` 可从锁定输入逐字节重现 committed docs；224 次 route 访问及专项交互通过；最终证据与实际 worktree 一致。
- 验证：`npm test`、`npm run smoke:public`、finalizer、artifact survival、`git diff --check`、`git status --short`。
- 风险反例：生成中断不得破坏旧 docs；重复生成不得产生时间戳或顺序漂移；最终 proof 必须在提交前重新运行。

### Krea2 文件边界

```text
scripts/course-adapters/krea2.mjs
scripts/course-adapters/krea2-copy-edits.json
scripts/sync-teaching-packages.mjs
scripts/test-sync-fixture.mjs
scripts/teaching-source-lock.json
scripts/public-site-manifest.json
scripts/external-dependencies.json
scripts/verify-public-site.mjs
scripts/verify-workflow.mjs
tests/public-site.spec.mjs
package.json
.github/workflows/static.yml
docs/index.html
docs/teach/index.html
docs/teach/krea2/**
.codex/long-horizon/*.md
artifacts/final-manifest.json
.codex/governance/final-check.json
```

其余课程保持正文语义；全站门禁发现的响应式布局、滚动区可访问性与坏 HTML 由既有同步 sanitizer 统一修复。

## 可执行契约索引

- Sync 输入矩阵、退出码、staging、事务回滚和 sync-owned 路径以 `Prompt.md` 的“Sync CLI 与退出码”为唯一来源；实现必须提供 `--check`/`--write` 二选一，且不会直接清空 docs。
- `scripts/teaching-source-lock.json` 使用 schema 1；package、shared file、逐文件 hash、tree hash、路径排序、字段白名单和符号链接策略以 `Prompt.md` 的 JSON 契约为准。
- `docs/teach/pi/assets/js/search-index.js` 使用固定 `window.PI_SEARCH_INDEX` 对象 schema；entry 随索引携带完整 `searchText`，浏览器搜索不 fetch 章节；hash 输入是最终 14 个 chapter 的 `path + NUL + raw bytes + newline`，验证器独立重算，缺章/额外章/hash mismatch/entry 目标不符均退出 `1`。
- `scripts/public-site-manifest.json` 是提交的手工真相，包含 Prompt.md 冻结的完整 75 条 route 及 exact entry/asset/binary/sync-owned/orphan/interaction schema；验证器只读它，不生成或更新它。
- `scripts/external-dependencies.json` 将 executable runtime 和普通 reference link 分开，包含 Prompt.md 冻结的具体 records 与 host allowlist；required CDN failure 退出 `1`，optional font failure 只 warning，未 allowlist host 退出 `1`。

## Phase reviewer payload 清单

每个 Phase 在本地验证通过后按下面的固定边界启动全新 reviewer。reviewer 不得修改边界外文件，返回 `CONSENSUS`、`NEEDS_REVISION` 或 `BLOCKED`。

### Phase 1

```text
Phase Goal: 删除公开治理文案、修复已确认内容和死链接，并让 LingBot 五个 reference 可达。
File Boundary: docs/index.html; docs/teach/index.html; docs/teach/lingbot-video/index.html; docs/teach/lingbot-video/lessons/*.html; docs/teach/lingbot-video/reference/*.html; docs/teach/pi/chapters/01-what-is-pi.html; docs/teach/pi/chapters/14-contributing.html; docs/teach/anima/index.html; docs/teach/anima/course-map.html; docs/teach/anima/lessons/*.html; scripts/verify-public-site.mjs; scripts/sync-teaching-packages.mjs; package.json; package-lock.json; .nvmrc。
Review Focus: visible support leakage, SGLang occurrence consistency, orphan reference links, href="#", fake issue/CVE, Anima visible .md labels。
Verification: node scripts/verify-public-site.mjs --content-only; node scripts/verify-public-site.mjs --links; git diff --check。
Non-goals: Pi search implementation, shared metadata rewrite, FLUX binary deletion, workflow or npm changes。
```

### Phase 2

```text
Phase Goal: 实现覆盖 14 章的静态 Pi search index 和跨页面可访问导航。
File Boundary: docs/teach/pi/index.html; docs/teach/pi/course-map.html; docs/teach/pi/chapters/*.html; docs/teach/pi/assets/js/app.js; docs/teach/pi/assets/js/search-index.js; docs/teach/pi/assets/style.css; scripts/generate-pi-search-index.mjs; scripts/normalize-pi-pages.mjs; scripts/verify-public-site.mjs; scripts/sync-teaching-packages.mjs。
Review Focus: hash formula, route resolution, keyboard activation, missing-index fallback, no-result state, mobile overlay。
Verification: node scripts/generate-pi-search-index.mjs --check; node scripts/verify-public-site.mjs --search; node --check scripts/generate-pi-search-index.mjs。
Non-goals: other course content, CDN policy, source lock, GitHub Actions。
```

### Phase 3

```text
Phase Goal: 统一 75 页 metadata/favicon/semantic structure 并修复已确认 accessibility 问题。
File Boundary: docs/**/*.html 的 head/template 修改; docs/teach/assets/favicon.svg; docs/teach/lingbot-video/assets/favicon.svg; docs/teach/{home.css,pi/assets/style.css,lingbot-video/assets/course.css,anima/anima.css,ideogram4/paper.css}; docs/teach/pi/course-map.html; scripts/canonical-favicon.svg; scripts/normalize-public-metadata.mjs; scripts/verify-public-site.mjs; scripts/sync-teaching-packages.mjs。
Review Focus: exact-one h1/main, descriptions, favicon relative paths, unique root/teach/FLUX entry content, heading order, contrast/focus/labels。
Verification: node scripts/verify-public-site.mjs --structure; node scripts/verify-public-site.mjs --a11y-static; git diff --check。
Non-goals: lesson factual rewrite except required structure, source lock, CI workflow。
```

### Phase 4

```text
Phase Goal: 删除 9 个未引用 FLUX.2 图片并收紧公开 binary allowlist。
File Boundary: docs/teach/flux2/assets/i2i_klein.jpg; docs/teach/flux2/assets/i2i_upsample_example.png; docs/teach/flux2/assets/i2i_upsample_input.png; docs/teach/flux2/assets/klein_benchmark.jpg; docs/teach/flux2/assets/t2i_klein_others.jpg; docs/teach/flux2/assets/t2i_klein_realism.jpg; docs/teach/flux2/assets/t2i_upsample_example.png; docs/teach/flux2/assets/teaser_editing.png; docs/teach/flux2/assets/teaser_generation.png; scripts/sync-teaching-packages.mjs。
Review Focus: no HTML/CSS/JS reference, MIME correctness, 200 local asset response, no unrelated deletion。
Verification: node scripts/verify-public-site.mjs --assets; file docs/teach/flux2/assets/*; node scripts/verify-public-site.mjs --local-assets。
Non-goals: course page text, shared favicon/logo, other binary assets。
```

### Phase 5

```text
Phase Goal: 以 source lock、staging、rollback 和 fixture 双次 hash 证明 sync 输入/输出可复现。
File Boundary: scripts/sync-teaching-packages.mjs; scripts/test-sync-fixture.mjs; scripts/teaching-source-lock.json; scripts/canonical-favicon.svg; scripts/anima.css; scripts/fixtures/sync/**; README.md; sync-owned generated output only。
Review Focus: CLI/env matrix, lock schema, raw-byte hash, symlink rejection, staging isolation, atomic replacement, rollback, docs non-owned preservation, no /tmp literals。
Verification: node scripts/test-sync-fixture.mjs --missing-root; node scripts/test-sync-fixture.mjs --conflicting-root; node scripts/test-sync-fixture.mjs --lock-mismatch; node scripts/test-sync-fixture.mjs --double-hash; node --check scripts/sync-teaching-packages.mjs。
Non-goals: CI workflow, public route manifest, browser smoke implementation。
```

### Phase 6

```text
Phase Goal: 在 Pages upload 前建立静态 validator、CDN policy、Chromium smoke 和 job dependency gate。
File Boundary: scripts/public-site-manifest.json; scripts/external-dependencies.json; scripts/verify-public-site.mjs; scripts/smoke-public-site.mjs; scripts/verify-workflow.mjs; scripts/verify-artifact-survival.mjs; scripts/test-sync-fixture.mjs; scripts/canonical-favicon.svg; playwright.config.mjs; tests/public-site.spec.mjs; package.json; package-lock.json; .nvmrc; .github/workflows/static.yml。
Review Focus: manifest equality, visible-text parser boundary, runtime/reference link classification, required/optional network exit codes, 75-route desktop/mobile sweep, deploy needs graph。
Verification: npm ci; npm run verify:public; npm run test:sync-fixture; npm run smoke:public; node scripts/verify-workflow.mjs .github/workflows/static.yml; node scripts/verify-public-site.mjs --manifest; npm run verify:artifacts -- --target . --output .codex/governance/final-check.json --require-path scripts/public-site-manifest.json.
Non-goals: source sync invocation, source package access, new public lesson content。
```
