# Project Guidelines (项目开发与自检规则)

## 前端开发与自我验证强制规则 (Frontend Self-Verification Rule)
- 任何时候修改或新建前端代码 (`.tsx`, `.ts`, `.jsx`, `.js`, `.vue`, `.css`) 后，**严禁未验证直接完工**。
- 修改代码后，**必须自动加载并遵循 [frontend-self-verification](file:///Users/zpb/person/blog/new-blog/blog-web/.agents/skills/frontend-self-verification/SKILL.md) 技能**。
- 必须自动运行 `npm run build` / `npx tsc --noEmit` 进行类型与构建校验，并完成作用域与数据持久化逻辑审计，直到 Exit Code 0 为止。

## 全链路数据持久化与防虚假保存铁律 (End-to-End Persistence Audit Rule)
- 涉及任何前端输入框、文本域（TextArea）、表单、配置开关的修改或新增时，**严禁只写 UI 交互和弹出“保存成功”的假持久化**！
- **必须自动加载并遵循 [end-to-end-persistence-audit](file:///Users/zpb/person/blog/new-blog/blog-web/.agents/skills/end-to-end-persistence-audit/SKILL.md) 技能**。
- 必须自底向上核查全部 6 层闭环（数据库物理字段 -> ORM 模型映射 -> 控制器写入解构 -> 详情接口读取与防覆盖 -> 前端请求 Payload 实装携带 -> 业务下游真实消费）。
- 必须通过接口与数据库实机验证数据真实写入落盘后，方可向用户汇报完工。

