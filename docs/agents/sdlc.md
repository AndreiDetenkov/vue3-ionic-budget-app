# SDLC & Agent Skills Bindings

When starting any task, invoke the `using-agent-skills` meta-skill first and route work through its full **Skill Discovery** tree and **Lifecycle Sequence**. Do not skip phases or verification steps.

```text
  DEFINE          PLAN           BUILD          VERIFY         REVIEW          SHIP
 ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
 │ Idea │ ───▶ │ Spec │ ───▶ │ Code │ ───▶ │ Test │ ───▶ │  QA  │ ───▶ │  Go  │
 │Refine│      │  PRD │      │ Impl │      │Debug │      │ Gate │      │ Live │
 └──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  /spec          /plan          /build        /test         /review       /ship
```

## Phase & Skill Bindings for This Repository

| Phase | Diagram Command | Direct Skills (`agent-skills`) | Repository Binding (`vue3-ionic-budget-app`) |
| --- | --- | --- | --- |
| **1. DEFINE** (`Idea / Refine`) | `/spec` | `interview-me`, `idea-refine`, `spec-driven-development`, `constraint-driven-development` | Read `GLOSSARY.md` and `docs/adr/` first (see `docs/agents/domain.md`). Surface explicit `ASSUMPTIONS` before writing specs or code. Publish specs in Russian **exclusively** inside the target GitHub Issue via `gh issue create` / `gh issue edit` — never create local spec files (`docs/specs/`, `SPEC.md`). |
| **2. PLAN** (`Spec / PRD`) | `/plan` | `planning-and-task-breakdown` | Append the task breakdown and verification checkboxes (`- [ ]`) in Russian directly to the same GitHub Issue (never in `tasks/plan.md` or `tasks/todo.md`). Apply the `ready-for-agent` label (`gh issue edit <n> --add-label "ready-for-agent"`). |
| **3. BUILD** (`Code / Impl`) | `/build` | `incremental-implementation`, `frontend-ui-engineering`, `api-and-interface-design`, `source-driven-development`, `doubt-driven-development`, `context-engineering` | Also load the matching workspace skills in `.agents/skills/` (`vue-best-practices`, `vue-pinia-best-practices`). Access persistence exclusively through the `BudgetStorage` port (`useStorage()`). Deliver in thin, verifiable vertical slices. |
| **4. VERIFY** (`Test / Debug`) | `/test` | `test-driven-development`, `debugging-and-error-recovery`, `browser-testing-with-devtools` | Also load `.agents/skills/vue-testing-best-practices` (and `vue-debug-guides` when debugging). Follow strict Red → Green → Refactor. Inject `createInMemoryStorage(seed)` via `setStorage()` in unit/component tests. Run `pnpm test:unit run`, `pnpm typecheck`, `pnpm lint`, and `pnpm format` after every slice. |
| **5. REVIEW** (`QA / Gate`) | `/review`, `/code-simplify` | `code-review-and-quality`, `code-simplification`, `security-and-hardening`, `performance-optimization` | Run the five-axis `code-review-and-quality` review in a fresh-context `code-reviewer` subagent before merge. Follow with `code-simplification` to remove unnecessary complexity without changing behavior. |
| **6. SHIP** (`Go / Live`) | `/ship`, `/pr` | `git-workflow-and-versioning`, `pr`, `shipping-and-launch`, `documentation-and-adrs`, `deprecation-and-migration`, `ci-cd-and-automation`, `observability-and-instrumentation` | Branch from `main` using `<type>/<slug>` (`feat/...`, `refactor/...`, `fix/...`). Make atomic Conventional Commits and report `CHANGES MADE` / `THINGS I DIDN'T TOUCH`. Before opening a PR: mark completed checkboxes (`- [x]`) in the GitHub Issue via `gh issue edit`, push the branch, and create the PR via `gh pr create` using the `/pr` template (`## Summary`, `## Evidence`, `## Merge Danger`) with an English title, Russian body, and `Closes #<issue>`. Update `GLOSSARY.md` / `docs/adr/` when domain terms or architectural decisions change. |
