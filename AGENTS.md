# Project Guidelines (项目开发与自检规则)

## 前端开发与自我验证强制规则 (Frontend Self-Verification Rule)
- 任何时候修改或新建前端代码 (`.tsx`, `.ts`, `.jsx`, `.js`, `.vue`, `.css`) 后，**严禁未验证直接完工**。
- 修改代码后，**必须自动加载并遵循 [frontend-self-verification](file:///Users/zpb/person/blog/new-blog/blog-web/.agents/skills/frontend-self-verification/SKILL.md) 技能**。
- 必须自动运行 `npm run build` / `npx tsc --noEmit` 进行类型与构建校验，并完成作用域与数据持久化逻辑审计，直到 Exit Code 0 为止。
