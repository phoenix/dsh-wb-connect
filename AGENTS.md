# dsh-workbuddy-connect

DSH 插件：把 WorkBuddy 桌面 App 的模型接入 DeepSeek Harness。fork 迭代于 `phoenix/dsh-wb-connect`（上游已停维护）。

## 铁律

- **`lib/` 构建产物必须随源码提交**：git 直装不跑 `prepack`。改 `src/` → `pnpm check` → `git add lib/` 一起提交，否则装到陈旧 lib、改了不生效。
- 只用 pnpm；中文 Conventional Commits；UTF-8 无 BOM；最小侵入；提交前 `git diff --ignore-cr-at-eol` 验真差（Windows CRLF 陷阱）。
- 测试 `pnpm vitest run`（TDD）；`issue-133-wslenv` 是环境挂，非回归。
- README 保持空白（防他人误用），勿补用户文档。