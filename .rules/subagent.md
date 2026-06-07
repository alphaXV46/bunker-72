# AI SOP & Behavioral Guidelines

This document establishes strict operational Standard Operating Procedures (SOPs) for AI subagents and code generation assistants working in the Bunker 72 repository.

---

## 1. Zero-Tolerance Anti-Regression Policy
*   **Documentation Preservation:** AI subagents must never delete, modify, or truncate existing developer comments, design rules, or JSDoc documentation, unless explicitly instructed by the user.
*   **Feature Integrity:** Prior to editing any component, the assistant must inspect dependencies (e.g., model-to-view relationships) to ensure changes do not break other areas of the application.
*   **No Placeholders:** The AI is strictly prohibited from writing code containing comments like `// ... rest of the code`, `// TODO: Implement later`, or leaving empty stubs for existing code blocks. The code written must be complete, functional, and production-ready.

---

## 2. Mandatory Verification & Build Check
*   **Local Build Validation:** Before concluding a task, the subagent must execute the production build pipeline:
    ```powershell
    npm run build
    ```
*   **Build Inspection:** If the build command emits syntax warnings, typescript/vite compiler errors, or module resolution failures, the task is considered **incomplete**.
*   **Zero-Error Tolerance:** Code must build successfully. All warnings or errors must be fixed in the source files before finalizing.

---

## 3. Deadlock Mitigation Protocol
To prevent infinite retry loops, automated code revision loops must adhere to the following throttle constraints:

| Consecutive Build/Lint Failures | Action Required |
| :--- | :--- |
| **1st Failure** | Inspect build error log. Analyze local scope and import maps. Apply targeted fix. |
| **2nd Failure** | Review cross-file dependencies (MVC bindings). Check for import conflicts or syntax errors. |
| **3rd Failure** | **HALT IMMEDIATE.** Stop all automatic code updates. Revert files to their last known stable state. Document the error stack and present the log to the human developer for manual intervention. |

---

## 4. Execution Output Format
At the end of every task execution, the subagent must report their actions using the following structured template:

```text
[EXECUTION REPORT]
- Completed Steps: [List step-by-step accomplishments]
- Modified Files: [List of file paths modified]
- Build & Syntax Status: [Passed / Failed (Attach Error Log if failed)]
- Execution Status: [Success / Awaiting Human Review]
```
