<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

## 本地调试服务（Codex 必读）

启动本项目请使用项目启动器，不要直接反复执行 `pnpm dev`：

```bash
pnpm dev:local
```

启动器固定使用 `http://localhost:3000`，会检查 PostgreSQL、加载 `.env` / `.env.local`，为本地缺失的 `AUTH_HMAC_KEY` 生成并保存到 `var/local-auth-key`，后台运行 Next dev，并验证首页和实际 CSS 资源均返回 200。

常用命令：

```bash
pnpm dev:local:status  # 查看 3000 端口占用者
pnpm dev:local:check   # 检查首页和 CSS 健康状态
pnpm dev:local:stop    # 停止本项目占用 3000 的旧服务
```

端口被本项目旧的 Next 服务占用时，`pnpm dev:local` 会安全停止旧服务后重启；如果占用者不是本项目（工作目录不匹配），脚本会拒绝终止并提示人工处理。日志写入 `var/local-dev.log`，PID 写入 `var/local-dev.pid`。

生产构建使用独立的 `.next-build`，开发服务使用 `.next`。可以执行 `pnpm build`，但不要手动让多个 Next dev 进程同时监听 3000；若页面样式异常，先运行 `pnpm dev:local:status`，再运行 `pnpm dev:local`。
