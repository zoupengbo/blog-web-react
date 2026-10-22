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

## 代码修改透明度与完工汇报铁律 (Modified Files Disclosure Rule)
- 任何时候修改或新建前端代码/样式/组件/配置后，**向用户汇报时必须完整列出本次所有修改与新建的文件清单（带 Markdown 文件超链接，如 `[EditorView.tsx](file:///...)`）**，并清晰附带每个文件的具体改动点说明，严禁空泛汇报！

## 未明确指令严禁擅自修改代码铁律 (Explicit Command Modification Rule)
- **严格区分“咨询探讨”与“修改指令”边界**：
  1. 用户的提问、追问、探讨、剧情求证或原理推导（如“为什么没有这一步”、“他可能有专职司机吗”等），**一律严格定性为业务咨询与技术探讨**；
  2. 在咨询探讨模式下，**严禁越俎代庖、严禁擅自调用任何写文件工具修改代码、配置或提示词**！必须仅用客观专业的纯文本进行原理拆解与答疑；
  3. **只有当用户明确带有“要你改”、“给我改”、“修改一下”、“立即改掉”等显式修改字样或下达明确改动指令时，方可动手修改代码**！未收到显式修改指令，绝不擅作主张动哪怕一行代码！

## 提示词单一数据源与题材精准解耦铁律 (Single Source of Truth & Genre Decoupling Rule)
- **题材精准解耦**：严禁全量硬拼死重！玄幻战斗（战斗8步推进、金手指克制律、战力成长解耦）仅在明确为玄幻/战斗题材时加载；现实官场、都市职场小说绝对严禁加载任何玄幻打架死重与“拳拳到肉爆发反杀”说辞；
- **单一数据源（SSOT）**：所有跨题材通用的写作与排版军规，全局只在 `promptRules.js` 统一维护一份标准常量！`promptEngine.js`、`novelPluginManager.js`、`proseWriter.js` 一律只做纯净引用或专职增量，严禁在多个文件中重复硬编码复述同一条规则；
- **写手增强层专注增量**：`proseWriter.js` 增强层严禁重复抄录底层白描军规，其职责仅限注入：①本章节拍分镜、②读者期待卡、③责编自愈打回令；
- **Prompt 体量卡尺**：组装后的 System Prompt 总字符量必须严格控制在 **8,000 ~ 12,000 字符内**，坚决杜绝 4 万字长文本造成的注意力稀释与性能损耗。

## 汇报与总结纯文本代码块一键复制铁律 (One-Click Copyable Report Block Rule)
- 任何阶段性技术汇报、代码审计总结、测试验证结果或完工说明：
  1. 必须在回复中额外提供一个结构完整、排版整齐的 ` ```text ` 纯文本代码块；
  2. 确保用户在界面上只需点击一次“Copy（复制）”按钮即可完整获取全文，无需手动跨行选中；
  3. 纯文本代码块内部采用标准 ASCII 分隔符（如 `===`、`---`）、明确层级标题与结构化对照，杜绝零碎散乱。

## 完工自动 Git 提交与远程推送铁律 (Auto Git Commit & Push Rule)
- 任何时候在 `blog-web` 或 `blog-server` 中完成代码新增、重构或 Bug 修复：
  1. **明确定义**：用户的“提交”与“改完提交”，**严格指代 `git add .` + `git commit` + `git push origin master` 全流程闭环**；
  2. **必须自动加载并遵循 [auto-git-commit](file:///Users/zpb/person/blog/new-blog/blog-web/.agents/skills/auto-git-commit/SKILL.md) 技能**；
  3. 严格遵循“先自测自检，后自动提交推送”原则：前端 `npx tsc --noEmit` 与 `npm run build` Exit Code 0、后端测试 100% 通过；
  4. 验证通过后，**必须立即自动执行暂存、规范提交并推送到远端 master 分支 (`git push origin master`)**，严禁未提交推送直接结束任务！
  5. 向用户完工汇报时必须完整展示本次 Git Commit Hash、推送远程分支状态与提交信息。

## 前端暗黑模式与对比度防反白铁律 (Dark Mode & Contrast Immunity Rule)
- 涉及任何前端 UI、卡片、列表、弹窗（Modal/Drawer/Popover/Tooltip）的编写与重构时：
  1. **严禁硬编码亮色浅背景**：严禁直接写死 `background: '#fff'`、`'#ffffff'`、`'#f8fafc'`、`'#f0fdf4'` 等静态浅色背景！凡涉及容器底色，必须统一引入全局 `useTheme()` 钩子，通过 `isDark ? darkColor : lightColor` 做动态主题适配；
  2. **防白底白字（反白死局）**：在 Ant Design 暗黑主题下，`<Text type="secondary">` 等文本组件颜色会被自动染为浅灰白色（`rgba(255, 255, 255, 0.45)`）。一旦置于浅色背景上将造成灾难性的“白底白字”不可见现象；因此内联声明背景色时，**必须显式配套声明文本颜色**或直接使用主题自适应色卡；
  3. **Portal 容器隔离穿透认知**：Ant Design 的 `Modal`、`Drawer`、`Dropdown`、`Tooltip` 均挂载在 `document.body` 下，脱离了页面主容器（如 `.ai-novel-lab-container`）。若在 SCSS 中编写暗黑样式，必须在根级 `.dark-theme, [data-theme="dark"]` 下编写，严禁仅嵌套在页面局部 Class 内导致弹窗样式穿透失效。





