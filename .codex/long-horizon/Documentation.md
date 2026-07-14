# Documentation

## 当前状态

- 项目状态：已完成
- 当前里程碑：M6，公开产物、浏览器证明、artifact proof 与差异检查完成
- 下一步：无剩余实现项；提交当前分支并交付结果。
- 本轮初始 worktree：`master...origin/master`，无既有修改。
- 当前公开基线：75 个 HTML；72 个缺 description；56 个缺 favicon；Pi course-map 缺 `<main>`；FLUX.2 有 9 个未引用图片。

## 里程碑状态

- M1：完成（本地契约验证通过；独立 Planning Council reviewer 因工具层连续超时记为 `SKIPPED`，不等同于 `CONSENSUS`）。规格、finding matrix、source lock、CDN、reviewer 和 finalizer 契约已写入四份文档。
- M2：完成。Phase 1-6 实现、静态验证、sync fixture、156 项 Chromium smoke、Chrome DevTools MCP 检查和 workflow graph 已通过。
- M3：完成本地 proof、Chrome MCP proof 和 local artifact-survival fallback；官方 finalizer 因共享 helper 缺失返回 `1`，最终只读 reviewer 因工具层连续超时记为 `SKIPPED`，不等同于 `CONSENSUS`。
- M4：完成。Krea2 深模块、45 文件输入契约、37 HTML 输出、两份确定性文案修订表、固定 revision 链接、source schema 和 11 个对抗测试通过。
- M5：完成。112 route manifest、reference dependency policy、静态内容/链接/metadata/零脚本门禁、workflow 与 sync fixture 通过。
- M6：完成。232/232 Chromium、Krea2 details/axe、全站资源/CSS/控制台/水平溢出门禁、逻辑审查和仓库级 `npm test` 通过。

## 决策记录

- 2026-07-12：发布真相固定为提交到 `docs/` 的产物，CI 不调用 source sync。
  - 原因：外部 source package 不在仓库中，CI 重建会引入不可复现输入并可能覆盖公开修复。
- 2026-07-12：保留 CDN，使用 executable dependency allowlist 和 required/optional 失败级别。
  - 原因：用户选择保留 CDN，但必须把网络失败与本地页面失败分开。
- 2026-07-12：`--source-root` 优先于环境变量；冲突时失败；缺 root 时退出 2。
  - 原因：避免多个绝对路径被静默选择，保证同步输入可审计。
- 2026-07-12：Pi search index 在每个 entry 中携带完整 `searchText`；浏览器搜索不 fetch 章节页面。
  - 原因：保持全文搜索，同时满足静态站点不新增运行时网络依赖的硬约束。
- 2026-07-12：LingBot runtime 使用固定尺寸占位槽、Canvas `runtimeReady`/step 标记和 `preserveDrawingBuffer`；浅色动态图取消整体 opacity dim，改用可读颜色。
  - 原因：Chrome Lighthouse 发现动态插入造成 CLS 0.3366、浅色流程图最低对比度 1.92:1，以及未保留 framebuffer 导致像素 smoke 读到透明画布。

## 如何运行与演示

- 安装：使用 `.nvmrc` 指定的 Node 版本运行 `npm ci`。
- 启动：使用 Playwright `webServer` 启动 `python3 -m http.server 4173 --directory docs`。
- 验证：`npm run verify:public`、`npm run test:sync-fixture`、`npm run smoke:public`。
- 演示：目录页 LingBot 入口；Pi 搜索 `compaction`；LingBot `下一步`/`重播`；桌面与 390px route sweep。

## 已知问题与后续事项

- 当前 Planning Council 的历史结果为 `NEEDS_REVISION`；该结论已对应修订 CLI/output-root 事务、lock schema、Pi index schema、75-route manifest、CDN/reference records、visible-text 边界和真实 Phase 路径。最终一次新 reviewer 连续 5 次等待窗口无输出，随后按规则记为 `SKIPPED`；本地 validator、75-route/entry/interaction 集合证明和逐项契约审查作为前置证据，不能替代 reviewer 结论。
- 初始记录的“尚无 package manifest/validator/smoke/manifest/lock”只描述基线；当前这些交付物均已存在并通过验证。
- 外部普通学习资料链接只做语法/host 检查，不承诺长期网络可达；required CDN 资源失败会阻断对应 smoke 页面。

## 最终验证证据

- 最终结果：通过；最终独立 reviewer 返回 `Go`，无阻断 finding。
- finalizer 命令：`python3 /Users/charslee/.agents/skills/long-horizon-runner/scripts/finalize_long_horizon_run.py --target .`
- manifest：`artifacts/final-manifest.json`（由明确标注的 local fallback 生成）
- 必需 artifact：四份 long-horizon 文档、Krea2 adapter/fixture/修订表、source lock、public/dependency manifest、sync/public/workflow validator、Playwright config/tests、Krea2 代表产物和 artifact report，共 24 项。
- 备注：官方 finalizer 已实际运行，文档检查通过后因共享 `workflow-governance` helper 缺失返回 `1`；local fallback 对 24 个 required artifacts 执行 regular-file、非空和 SHA-256 检查，结果写入 manifest 与 survival report。

## 审计日志

- 2026-07-14 09:02：用户批准 Krea2 集成策略并要求实施；读取 implement、karpathy-guidelines、long-horizon-runner 及其原则/陷阱，复核四份既有工作文档。
  - 结果：保留上一轮 75 页历史，新增 M4-M6；冻结 45 输入、37 HTML 输出、固定 Krea revision、全课程文案约束、112-route 验收和 CI/浏览器失败分级。
- 2026-07-14 09:03：执行变更前 thought experiment，覆盖输入被篡改、source schema 缺节、固定代码行号漂移、同步中途失败、字体断网被重复升级、长文本窄屏溢出。
  - 结果：各反例分别落到 lock/schema/revision/staging transaction/network classification/Playwright overflow 门禁，未发现需要扩大到其他五个课程正文的理由。
- 2026-07-14 09:50：完成 M4/M5 非浏览器实现与 stop-and-fix。
  - 结果：真实源包生成 37 个 Krea2 HTML、1 个 CSS、零 JS；公开站总计 112 HTML；source lock 的 Krea2 record 固定 45 个输入，重复 `--check` 可逐字节重现。
  - 独立 adapter reviewer 首轮返回 `No-go`，指出脚本注入、剩余 31 处“而不是”、Markdown 文本链接、路径/行号白名单、MISSION/review 语义、evidence 链接与 H1/H2 层级缺口；逐项加入实现与失败测试后，6/6 adapter 测试通过，真实生成页禁用句式归零。
  - `npm run verify:public`、`npm run verify:workflow`、`npm run test:sync-fixture`、全部 `node --check` 与 `git diff --check` 返回 0。Krea2 85 个唯一参考 URL 由精确 URL 或固定 commit 前缀声明；本地 Markdown、治理路径、越级相对代码链接和原始 Markdown 语法归零。
- 2026-07-14 10:00：首轮 232 项 Chromium 暴露 28 项失败；Krea2 的 37 个 route 渲染全部通过，移动 axe 在 Krea2 lesson 14 的 `.diagram` 与 `pre` 报滚动区缺少键盘焦点。
  - 旧课程失败分为三类：Pi 两套主栏标记缺少宽度约束；Ideogram 宽表格撑开移动视口；LingBot KaTeX、宽表格和长 inline code 共同撑开页面。
  - 进一步检查 Pi 第 6 章发现源 HTML 用原始 Markdown 围栏结束目录树，缺少 `</code></pre>`，并含重复 `class` 属性；浏览器因此把后续代码块解析成嵌套结构。
- 2026-07-14 10:23：将响应式与可访问性修复写回同步生成链。
  - Krea2 适配器为 `pre`、`.diagram`、`.table-wrap` 生成焦点属性和名称；Ideogram、LingBot、Pi sanitizer 为实际滚动区生成同类属性。
  - Pi sanitizer 精确闭合坏代码块并去除重复 class；静态结构检查新增公开 HTML 原始 Markdown 围栏拒绝规则。
  - 浏览器反事实注入先证明候选 CSS 在全部 11 个 LingBot 课时、三个 Ideogram 样本与 14 个 Pi 章节把 document/body overflow 降为 0，再落盘重建。
- 2026-07-14 10:32：完整双视口回归通过，`232 passed (3.7m)`。
  - 覆盖 112 desktop route、112 mobile route、Pi 跨章搜索、LingBot Canvas next/replay、Krea2 原生 details 与六个代表页 axe；本地 CSS 非空加载、站内资源、required runtime、console error、document/body 水平溢出均为硬失败。
- 2026-07-14 10:36：logic-review 收口发现导出适配器单独调用时仍接受非空输出目录并跟随必需输入符号链接。
  - 深模块现要求 regular package/directory/file 输入，输出目录要求不存在或为空；新增 stale output 与 symlink source 两个失败测试，Krea2 adapter 达到 8/8。
  - `npm run test:sync-fixture` 继续通过 missing/conflict/lock/symlink/rollback-preservation/double-write 全部场景；`--check --source-root /private/tmp`、public/workflow validator 与 `git diff --check` 返回 0。
- 2026-07-14 10:45：仓库级最终 `npm test` 返回 0。
  - Krea2 adapter 8/8、112-route public validator、workflow graph、sync fixture 和 Chromium 232/232 按 CI 顺序串行通过。
  - 手工 HTTP server 在测试结束后已停止；没有遗留 Playwright 或 server 会话。
- 2026-07-14 10:55：最终只读 reviewer 返回 `No-go`，复现 Krea2 source 中的 `onclick` 与 `javascript:` 可穿过零脚本边界。
  - 适配器现统一拒绝 `on*`、`srcdoc`、去除控制字符后以 `javascript:`/`vbscript:` 开头的任意属性值；public validator 对 committed Krea 输出执行同套检查。
  - 新增 inline event handler 与 script URL protocol 两个恶意 fixture，adapter 达到 10/10；reviewer 提到的 rollback 故障注入属于低风险后续测试缺口，本次 sync fixture 已覆盖事务前失败的输出保持与现有 rollback-preservation 路径。
- 2026-07-14 10:57：parse5 全站误差审计发现 Pi 第 1/9 章代码示例有 6 个未转义 `<`，会依赖浏览器错误恢复。
  - Pi sanitizer 精确转义 shell `<<`、TypeScript `<=`/`<`；`verify:public --structure` 现将任意 parse5 error 作为硬失败，112 页语法错误归零。
  - 修复后 Krea2 adapter 10/10、public validator、sync fixture 与 source `--check` 返回 0；最终 reviewer 已收到复审请求。
- 2026-07-14 11:00：第二轮最终只读 reviewer 发现 Markdown 文本链接会在首轮 DOM 安全检查后生成新的 `javascript:` anchor。
  - 活动内容检查移到全部文本与链接改写完成后的最终 DOM 遍历；新增 Markdown 生成脚本协议恶意 fixture，Krea2 adapter 达到 11/11。
  - 第三轮独立 reviewer 返回 `Go`，无阻断 finding；确认 `onclick`、实体/控制字符脚本协议、Markdown 脚本链接和 `srcdoc` 均被拒绝。事务中途故障注入仍是低风险测试缺口，现有 fixture 已证明事务前失败保留原输出。
- 2026-07-14 11:07：干净环境按 CI 顺序执行仓库级 `npm test`，返回 0。
  - Krea2 adapter 11/11、112-route public validator、workflow graph、sync fixture 和 Chromium 232/232 串行通过；浏览器覆盖所有路由桌面/移动视口、本地 CSS 实际加载与非空、资源和控制台错误、水平溢出、Krea2 details、Pi 搜索、LingBot Canvas 与代表页 axe。
  - Playwright web server 正常退出，4173 端口没有残留监听进程。
- 2026-07-14 11:10：long-horizon 文档校验器对四份文档全部返回 `[OK]`；官方 finalizer 的共享 helper 仍缺失。
  - 仓库内 local fallback 对 24 个 required artifacts 完成 regular-file、非空和 SHA-256 survival 检查，刷新 `.codex/governance/final-check.json` 与 `artifacts/final-manifest.json`。

- 2026-07-12 11:52：读取 implement、long-horizon-runner 及其原则/陷阱说明；确认该任务需要里程碑验证和最终 artifact proof。
  - 结果：已创建四份工作文档，未修改公开站点。
- 2026-07-12 11:53：冻结用户选择的 docs-authoritative、保留 CDN、显式 source root 约束，并建立 F01-F10 finding-to-phase 映射。
  - 结果：M1 规格完成，待 validator 和 Planning Council 复审。
- 2026-07-12 12:00：执行前 Planning Council 仍返回 `NEEDS_REVISION`，指出需要把 source CLI/lock、Pi hash、manifest、CDN schema、CI job graph、visible-text parser 和逐 Phase payload 写成可执行契约。
  - 结果：已在 Prompt/Plan/Implement 中补充 schema、退出码、路径集合、hash 公式、job graph 和 Phase 1-6 五字段 payload；在取得新的 `CONSENSUS` 前不修改公开页面。
- 2026-07-12 12:10：根据第三次 Planning Council 的 8 项 finding 修订四份工作文档。
  - 结果：补充 output-root 相对路径/存在性/安全限制、逐路径 staging transaction 与反向 rollback；补充 lock additional-properties、类型、include 展开、sharedTree hash 和源布局；补充 Pi `window.PI_SEARCH_INDEX` schema 与 entry 生成边界；写入冻结的 75-route inventory、manifest item schema、runtime/reference dependency schema 和具体 runtime records；定义 parse5 hidden/noscript/svg/entity/whitespace 边界；将 Phase reviewer boundary/commands 改为实际路径和可执行命令，并具体化 report gate/upload artifact 失败语义。
- 2026-07-12 12:18：第四次 Planning Council 仍返回 `NEEDS_REVISION`，指出具体外链 URL/失败规则、manifest 非 route inventory、source package/output mapping、生成文件来源、Phase 5 npm 命令、Phase 6 Playwright 路径、CI 跨 job Chromium 和 untracked boundary 检查仍未完全冻结。
  - 结果：已补充精确 runtime/reference URL records、HTTP 2xx/10s/1 retry/初始化失败规则及 Node/Playwright/parse5/axe 版本；写入 entry/asset/binary/sync/orphan/interaction exact manifest JSON；明确五个 package 的 source/output/include、canonical favicon/.nojekyll 生成来源和 symlink 检查顺序；改为直接 fixture 命令、完整 Playwright/workflow 路径、独立 smoke job 安装 Chromium，并加入 untracked artifact 路径审查规则。
- 2026-07-12 12:29：第五次 Planning Council 仍返回 `NEEDS_REVISION`，剩余为三项契约缺口：Ideogram/FLUX include 文件名未展开，fixture/canonical favicon 未进入对应 Phase boundary，reviewer boundary 检查只看 boundary 内集合。
  - 结果：已展开 7 个 Ideogram HTML 与 6 个 FLUX reference HTML 的精确文件名；Phase 3/5/6 加入 `scripts/canonical-favicon.svg` 和 `scripts/test-sync-fixture.mjs`；新增 phase baseline + 全量 actual 集合差分规则，明确发现 boundary 外 tracked/untracked 变更。
- 2026-07-12 12:43：修订后的前置 reviewer（高推理 fork、普通 explorer fork）均在 5 个等待窗口内无输出，关闭实例并标记 `SKIPPED`；未将其当作通过。
- 2026-07-12 14:25：最终独立 reviewer 使用完整最终 review payload 启动；连续等待窗口无结果，关闭 agent，状态记为 `SKIPPED`，不作为 `CONSENSUS`。
- 2026-07-12 14:27：官方 `finalize_long_horizon_run.py` 的 docs/required-path 校验通过，但共享依赖 `/Users/charslee/.codex/skills/workflow-governance/scripts/verify_artifact_survival.py` 不存在，官方 finalizer 返回 `1`，未伪造成功。
  - 结果：加入仓库内 `scripts/verify-artifact-survival.mjs` 作为明确标注的 local fallback；21 个 required artifacts 的 regular-file、非空和 SHA-256 survival 校验通过，并生成 `.codex/governance/final-check.json` 与 `artifacts/final-manifest.json`。
- 2026-07-12 14:16：最终实现 proof。
  - `node scripts/sync-teaching-packages.mjs --check --source-root /private/tmp` 返回 0；`npm run verify:public`、`npm run verify:workflow`、`npm run test:sync-fixture` 和全部 `node --check` 返回 0。
  - `npm run smoke:public` 返回 0：156/156 通过，75 desktop + 75 mobile + Pi search + LingBot Canvas + representative axe。
  - Chrome DevTools MCP：入口 Lighthouse desktop 100/100/100/100；Pi 第 10 章 Lighthouse desktop 100/100/100/100；LingBot course map desktop/mobile 均 100/100/100/100；代表页面无 console error，OGL CDN HTTP 200，Canvas 非透明且 next/replay 改变 hash、恢复 step 0。
  - Chrome 首轮发现并修复 Pi active badge 对比度 3.44:1、LingBot 浅色流程图对比度 1.92-2.46:1、动态布局 CLS 0.3366；修复后上述 Lighthouse 均无失败 audit。
  - 本地替代证据：`validate_long_horizon_docs.py --fail-on-placeholders` 返回 0；冻结 route inventory 为 75 且 unique/sorted；entryRoutes 为 10 且 unique/sorted；interactionCases 为 3 且 unique/sorted；source include 文件名、Phase boundary 和 baseline/full actual 差分规则已逐项复核。开始 Phase 1，但保留 reviewer 基础设施风险，最终仍需独立 review 或明确报告未执行。
- 2026-07-13 00:12：再次运行 `npm run smoke:public`，固定单 worker 后 156/156 通过：75 desktop route、75 mobile route、Pi `compaction` 跨章搜索、LingBot Canvas next/replay 和 3 个 representative axe 页面均通过。
- 2026-07-13 00:14：尝试用 Chrome DevTools MCP 对最终产物重新开页；MCP 返回已有 profile 被占用，`list_pages`/`new_page`/`select_page` 均无法连接。本次不把该次尝试记为通过；此前已经完成并记录的 Chrome MCP Lighthouse/console/network proof 保留为历史证据，Playwright 全量结果作为当前独立浏览器证据。
- 2026-07-13 00:15：对 CI job graph 做最后一次对抗式检查，发现 workflow 已手动启动 4173，而 Playwright 在 `CI=true` 会因 `reuseExistingServer: !process.env.CI` 再启动一个 server；已将 `playwright.config.mjs` 固定为 `reuseExistingServer: true`，避免 CI 端口竞争，workflow verifier 仍通过。
- 2026-07-13 00:27：实现完成后再次启动全量只读独立 reviewer `Peirce`，发送完整 actual-change-set、review focus 和 verification payload；连续 5 个等待窗口无结果后关闭实例，记为 `SKIPPED`，不等同于 `CONSENSUS`。本地 reviewer 证据仍由静态 validator、sync fixture、156/156 Chromium smoke 和 artifact survival report 提供。
