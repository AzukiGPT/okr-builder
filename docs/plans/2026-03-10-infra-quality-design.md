# Infrastructure & Quality — Fix & Guard

**Date**: 2026-03-10
**Approach**: A — Fix & Guard (Vercel + Vitest + Playwright + CI)

## 1. Vercel Auto-Deploy

**Problem**: Zero GitHub webhooks. Every deploy requires manual `npx vercel --prod`.
**Fix**: Run `npx vercel git connect` to create the GitHub ↔ Vercel integration.
**Result**: Push to `main` → automatic production deploy.

## 2. Vitest — Unit Tests

**Setup**: Install `vitest`, `@testing-library/react`, `jsdom`. Add `"test": "vitest run"` script.

**Priority test targets** (pure utils, no UI):
- `groupActions.js` — grouping by status, channel, phase, KR, team
- `computeSchedule.js` — date calculations
- `scoring.js` — score computations
- `parseContextValue.js` — context value parsing

**Coverage target**: ~15-20 unit tests covering normal + edge cases.

## 3. Playwright — E2E Tests

**Setup**: Install `@playwright/test`. Create `e2e/` directory.

**3 critical E2E tests**:
1. **Add action from template** — expand KR group → click "+Add" → verify action in table
2. **Create action manually** — open form → fill fields → click "Add" → verify in table
3. **Toggle views** — switch table → kanban → gantt without crash

No drag & drop tests (fragile in E2E).

## 4. CI Script

Add test step before build:
```json
"ci": "vitest run && vite build"
```

Configure Vercel build command to use `npm run ci`.
