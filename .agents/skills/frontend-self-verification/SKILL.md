---
name: frontend-self-verification
description: >-
  Must-use skill whenever modifying or creating frontend code (React, Vue, TypeScript, JSX, HTML, CSS).
  Mandates that after any code edit, the agent MUST independently perform self-verification steps (build/typecheck, state & scope audits, runtime risk checks) BEFORE declaring completion to the user.
---

# Frontend Self-Verification Workflow (前端修改自主验证规范)

This skill provides a rigorous, automated verification procedure that the AI assistant MUST perform after making any edits or creations to frontend code files (`.tsx`, `.ts`, `.jsx`, `.js`, `.vue`, `.css`). 

The goal is to ensure zero syntax errors, zero ReferenceErrors, correct state scope placement, and proper backend API data persistence before presenting results to the user.

---

## 🚨 Core Rules (核心硬性规则)

1. **Never Declare Completion Without Verification (修改后严禁直接完工)**
   Editing a file is only 50% of the task. Never inform the user that a bug is fixed or a feature is completed without running real verification commands.

2. **Mandatory Automated Build/Typecheck (强制静态构建与类型检查)**
   After editing any frontend code, automatically run build or typecheck tools (e.g., `npm run build`, `yarn build`, `npx tsc --noEmit`, or `npm run type-check`).
   - If build fails or reports TypeScript/JSX errors, **MUST fix all errors autonomously** and re-run the build until `Exit Code 0`.

3. **Check Runtime Safety & Scope Placement (代码作用域与运行时风险安全审计)**
   Before finalizing, audit your code against common frontend pitfalls:
   - **Unused or Undefined Variables**: Ensure all state variables (e.g., `useState`, `useRef`), imported icons, and helper functions are defined and accessible in the component scope.
   - **Hook Call Scopes**: Verify `useState`, `useEffect`, `useCallback` are declared at the **very top level** of the functional component (NOT inside `if` statements or conditional returns like `if (!data) return null;`).
   - **Component Props Completeness**: Verify that updated `interface` / `Props` signatures are fully passed down by parent components and properly destructured in child components.
   - **Data Persistence Continuity**: If adding or editing text/forms, ensure that on input change, blur, or submit, a proper API payload is sent to the backend database, rather than staying only in transient component state.

---

## 📋 Step-by-Step Verification Protocol (标准验证流程)

### Step 1: Code Structure & Scope Audit (代码排查)
Immediately after modifying code, check:
- [ ] Are all `useState` / `useRef` hooks placed above conditional returns?
- [ ] Are all imported components/icons present in `import` statements?
- [ ] Are prop types aligned between parent and child components?
- [ ] Are data mutations backed by persistence calls (API / localStorage / database)?

### Step 2: Automated Verification Command (运行编译与类型指令)
Execute the project's build/test script in the terminal:
```bash
# React / CRA / Vite
npm run build
# OR TypeScript check
npx tsc --noEmit
```
- Inspect the tool output and logs.
- If errors occur (e.g., `ReferenceError: xxx is not defined`, `Type 'X' is not assignable to type 'Y'`), immediately modify the code to fix them and re-run.

### Step 3: Synthesis & Reporting (验证通过后告知用户)
Only after the build command exits clean with code 0:
- Concisely summarize what was updated.
- State the verification result (e.g., "Build passed with Exit Code 0").
- Provide clear instructions on how the user can test or interact with the updated UI feature.
