# Development & Build Guidelines

## Build Commands & Verification
- **Do NOT run `vite build` for minor changes**: For small edits (CSS tweaks, UI adjustments, text/story content updates, minor bugfixes), do not run `vite build` or automated test builds. The user utilizes `npm run dev` with Vite HMR for live browser preview.
- **When to build**: Only run `vite build` when:
  1. Explicitly requested by the user.
  2. Performing major multi-file architectural refactors where dependency graph or bundler output validation is critical.
  3. Preparing a release or final verification milestone.
