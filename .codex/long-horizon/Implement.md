# Implement

## 执行守则

- 以 `Prompt.md` 和 `Plan.md` 为执行真相来源。
- 一次只推进一个 Phase/里程碑；不要把失败隐藏在后续批量改写中。
- 手工源码修改使用 `apply_patch`；批量 HTML 生成必须来自仓库内确定性脚本。
- 每个里程碑结束后必须执行验证、更新 `Documentation.md`，再进入下一个里程碑。
- 必需 artifact 一旦存在，只允许原位更新，不允许收尾时删除重建。
- 保留与本任务无关的用户修改；不使用 `git reset --hard` 或 `git checkout --`。

## 启动前检查

- 读取 `Prompt.md`、`Plan.md`、`Documentation.md`。
- 确认 `git status --short`，记录初始 worktree。
- 确认当前 Phase、已知 blocker 和必须存在的 artifact。
- 先运行 baseline route/metadata/link/asset inventory，避免把旧问题误判为新回归。

## 里程碑循环

1. 明确当前 Phase 的 `Phase Goal`、`File Boundary`、`Review Focus`、`Verification`、`Non-goals`。
2. 只在边界内做最小实现；生成器和公开产物必须保持同一规则。
3. 跑当前 Phase 的单文件/单脚本验证，再跑阶段完整验证。
4. 失败时停在当前 Phase，修复后重跑，不推进后续 Phase。
5. 启动全新只读 reviewer；只接受 `CONSENSUS`。
6. 将命令、结果、失败、修复和 reviewer 结论写入 `Documentation.md`。

## 关键验证顺序

- 内容：visible-text/support-path/static-link scan。
- 搜索：generator -> hash freshness -> browser navigation。
- 模板：HTML contract -> contrast -> axe representative pages。
- 资源：reference graph -> MIME -> 200 response -> size。
- sync：missing-root/conflict-root/lock-mismatch -> staging -> rollback -> double fixture hash。
- CI：workflow parse -> `npm ci` -> static verify -> Playwright smoke -> deploy prerequisite。

## 二次检查 Subagent

- 只有主实现完成、当前测试通过、diff 稳定后启动；不能与实现并行。
- 每个 reviewer 使用全新上下文，接收明确的五字段 payload，不进行 broad uncommitted review。
- payload 必须使用 `Plan.md` 中对应 Phase 的完整路径清单和命令，不允许由 reviewer 自行扩大 glob；Phase reviewer 启动前主 agent 将全量基线集合写入 `.codex/long-horizon/phase-baseline.txt`：`{ git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u`，并把该 baseline 文件自身加入集合。reviewer 使用不带 boundary pathspec 的全量集合 `actual = sort -u(git diff --name-only HEAD + git ls-files --others --exclude-standard)`，计算 `new = actual - baseline`，再计算 `unexpected = new - allowed-boundary`；只有 `unexpected` 为空才通过。这样边界外 tracked 和 untracked 文件都能被发现；baseline 文件及四份工作文档作为过程文件显式加入 allowed set。
- reviewer 只读，不编辑、commit、reset、checkout 或修改 source package。
- findings-first，必须带严重级别、路径/行号、复现命令和证据。
- `NEEDS_REVISION`/`BLOCKED` 留在当前 Phase；修复后再次本地验证并启动新的 reviewer。
- `SKIPPED` 只表示基础设施故障，不能作为通过。

## 子代理与搜索

- 可以使用本地 subagent 做限定边界的内容扫描、route graph、浏览器验证和 CI 审查。
- 所有重要发现先写入 `Documentation.md`，再决定是否修改代码。
- 外部事实只在确有必要时查询，优先使用官方/一手来源。

## 文档更新规则

- `Prompt.md`：仅在目标、非目标或硬约束变化时更新。
- `Plan.md`：仅在里程碑、架构意图、验收标准、风险或决策变化时更新。
- `Documentation.md`：每个循环更新；发生测试失败、边界漂移或 artifact 漂移时立即更新。

## 最终收口

1. 停止新增 scope，执行全量测试和独立 final review。
2. 将 `Documentation.md` 切到真实最终状态并填写 `## 最终验证证据`。
3. 运行 `finalize_long_horizon_run.py`，要求所有主 artifact 存在。
4. finalizer 失败时记录失败并停止，不进入盲目重写循环。
5. 通过 finalizer 后执行 `git diff --check`、`git status` 和最终 review，然后按实现技能要求提交当前分支。

## 禁止事项

- 不跳过验证，不在失败时推进，不把 MCP 未执行写成通过。
- 不让 `Documentation.md` 落后于真实状态。
- 不在收尾阶段删除并重建工作文档、manifest、lock 或主交付物。
- 不把 source sync 作为 CI 发布前提。

## CI 固定 job 图

```text
static -> smoke -> report -> deploy
```

- `static`：checkout、setup-node、`npm ci`、Chromium install、`verify:public`、fixture test。
- `smoke`：`needs: static`，在独立 job 自己 checkout、setup-node、`npm ci`、执行 `npx playwright install --with-deps chromium`，然后使用固定 4173 HTTP server 跑 Playwright 全量 route sweep；不依赖 static job 的文件系统或浏览器缓存。
- `report`：`needs: [static, smoke]` 且 `if: always()` 上传 trace/screenshot；随后 gate step 只有在两个上游都是 success 时才 success。
- `deploy`：`needs: [static, smoke, report]` 且 `if: needs.static.result == 'success' && needs.smoke.result == 'success' && needs.report.result == 'success'`；只有此 job 可以 upload Pages artifact 和调用 deploy-pages。
- report 的上传 step id 固定为 `upload-smoke-artifacts`，使用 artifact name `public-site-smoke`、`if: always()` 和 `if-no-files-found: error`；gate step 也使用 `if: always()`，只有表达式 `needs.static.result == 'success' && needs.smoke.result == 'success' && steps.upload-smoke-artifacts.outcome == 'success'` 成立时退出 0，否则退出 1。这样上传失败、static 失败或 smoke 失败都不能让 deploy job 运行；workflow 不调用 source sync。
