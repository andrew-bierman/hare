---
title: "Comprehensive E2E Testing for Hare Platform"
type: feat
status: active
date: 2026-04-04
---

# Comprehensive E2E Testing for Hare Platform

## Overview

Fix broken E2E tests, add real functionality testing (sign up, agents CRUD, tools CRUD, chat with LLM, webhooks, team, workspace management), and ensure all UI works across mobile (375px), tablet (768px), and desktop (1280px) viewports.

## Problem Statement

- 44 E2E test files exist with ~1001 tests, 988 passing, but many test stale/outdated UI
- Duplicate test files cover same features (e.g., `agents-focused` vs `agents-list`, `auth` vs `auth-comprehensive`)
- Missing coverage for: AgentConversationsPage, AuditLogsPage, scheduled tasks, activity feed, memory
- 855 `networkidle` waits causing flakiness
- Responsive tests use brittle CSS class selectors
- No tests verify real API/LLM calls end-to-end
- Tests only run in Chromium, single worker

## Proposed Solution

### Phase 1: Fix Infrastructure & Existing Tests (Priority: BLOCKING)

**1.1 Fix Stale Test Assertions**
- `apps/web/e2e/landing.e2e.ts` — Already fixed (3 failures: removed "Live Demo" references, fixed duplicate element selectors)
- Run each test file, fix selectors that don't match current UI
- Replace `waitForTimeout()` calls with explicit element waits
- Replace `waitForLoadState('networkidle')` with targeted `waitForSelector` or `waitForResponse`

**1.2 Consolidate Duplicate Tests**
Merge overlapping files to reduce maintenance burden:
- `auth.e2e.ts` + `auth-comprehensive.e2e.ts` → single `auth.e2e.ts`
- `agents-focused.e2e.ts` + `agents-list.e2e.ts` → single `agents-list.e2e.ts`
- `tools.e2e.ts` + `tools-list.e2e.ts` → single `tools-list.e2e.ts`
- `playground.e2e.ts` + `agent-playground.e2e.ts` → single `agent-playground.e2e.ts`
- `dashboard.e2e.ts` + `dashboard-home.e2e.ts` → single `dashboard.e2e.ts`

**1.3 Update Global Setup**
Add missing routes to warmup in `e2e/global-setup.ts`:
- `/dashboard/usage`
- `/dashboard/settings/team`
- `/dashboard/settings/billing`
- `/dashboard/settings/audit-logs`
- `/docs`
- `/privacy`
- `/terms`

### Phase 2: Real Functionality Testing (Priority: HIGH)

**2.1 Auth Flow — `auth.e2e.ts`**
- [ ] Sign up with valid credentials → redirects to /dashboard
- [ ] Sign in with existing user → redirects to /dashboard
- [ ] Sign out → redirects to /sign-in, session cleared
- [ ] Invalid login shows error message
- [ ] Password reset flow (request + reset page rendering)
- [ ] Session persistence across page reloads
- [ ] Protected routes redirect unauthenticated users to /sign-in

**2.2 Agents CRUD — `agents-crud.e2e.ts`**
- [ ] Create agent via form: name, model selection, system prompt, tool selection
- [ ] Agent appears in agents list after creation
- [ ] View agent detail page with correct data
- [ ] Edit agent: update name, model, prompt, tools
- [ ] Delete agent: confirm dialog, removed from list
- [ ] Create agent from template
- [ ] Agent validation: required fields, name length

**2.3 Agent Chat (Real LLM) — `agent-chat.e2e.ts`**
- [ ] Send message to agent, receive streamed response
- [ ] Multi-turn conversation (context maintained)
- [ ] Chat input clear after send
- [ ] Message history displayed correctly
- [ ] Keyboard shortcut (Enter to send, Shift+Enter for newline)
- [ ] Error handling for failed LLM calls
- [ ] Agent with tools: verify tool call execution in chat

**2.4 Tools CRUD — `tools-crud.e2e.ts`**
- [ ] Create custom HTTP tool: name, URL, method, headers, parameters
- [ ] Tool appears in tools list after creation
- [ ] Edit tool: update configuration
- [ ] Delete tool: confirm dialog, removed from list
- [ ] System tools are read-only (cannot edit/delete)
- [ ] Tool validation: required fields, URL format
- [ ] Tool test execution (if endpoint reachable)

**2.5 Dashboard & Analytics — `dashboard-analytics.e2e.ts`**
- [ ] Dashboard loads with stats cards (agents count, tool count, usage)
- [ ] Quick actions navigate to correct pages
- [ ] Analytics page renders charts and metrics
- [ ] Usage page shows API call statistics
- [ ] Date range filters work on analytics

**2.6 Settings — `settings-full.e2e.ts`**
- [ ] Profile settings: update name
- [ ] Security settings display
- [ ] API keys: create, view prefix, delete
- [ ] Notification preferences toggle
- [ ] Audit logs page loads (admin only)

**2.7 Webhooks — `webhooks-crud.e2e.ts`**
- [ ] Create webhook for agent: URL, events, secret
- [ ] Webhook appears in agent webhook list
- [ ] Edit webhook configuration
- [ ] Delete webhook
- [ ] Webhook validation: URL format, required fields

**2.8 Workspace & Team — `workspace-team.e2e.ts`**
- [ ] Default workspace created on first sign-up
- [ ] Team page loads member list
- [ ] Invite member by email
- [ ] Workspace switching (if multiple workspaces)

### Phase 3: Cross-Device Testing (Priority: HIGH)

**3.1 Viewport Configurations**
```typescript
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
}
```

**3.2 Responsive Test Matrix — `responsive-full.e2e.ts`**

| Feature | Mobile 375px | Tablet 768px | Desktop 1280px |
|---------|-------------|-------------|----------------|
| Landing page layout | Stacked, hamburger menu | 2-col features, visible nav | Full nav, 3-col features |
| Auth forms | Full width, touch-friendly | Centered card | Centered card |
| Dashboard sidebar | Hidden, hamburger toggle | Collapsed by default | Visible sidebar |
| Agent list | Single column cards | 2-column grid | 3-column grid or table |
| Tools list | Stacked cards | 2-column grid | Table view |
| Chat interface | Full screen, floating input | Side panel or full | Side panel with sidebar |
| Settings page | Stacked tabs | Tab navigation | Tab navigation |
| Forms (create agent) | Full width, stacked fields | 2-column layout | 2-column layout |
| Dialogs/modals | Full screen on mobile | Centered overlay | Centered overlay |
| Touch targets | Min 44px tap targets | Standard | Standard |

**3.3 Per-Device Tests**
- [ ] Navigation: sidebar visibility, hamburger menu, breadcrumbs
- [ ] Forms: input sizing, label visibility, button placement
- [ ] Tables/lists: layout transitions, scroll behavior
- [ ] Modals: full-screen vs overlay behavior
- [ ] Touch targets: minimum 44px on mobile

### Phase 4: Missing Coverage (Priority: MEDIUM)

**4.1 New Test Files Needed**
- [ ] `agent-conversations.e2e.ts` — Conversation history page
- [ ] `audit-logs.e2e.ts` — Audit log viewing
- [ ] `embed-widget.e2e.ts` — Public embed widget functionality
- [ ] `api-keys.e2e.ts` — Dedicated API key management tests

### Phase 5: Test Quality Improvements (Priority: LOW)

- [ ] Add multi-browser projects to Playwright config (Firefox, WebKit)
- [ ] Replace all `waitForTimeout()` with explicit waits
- [ ] Replace all `networkidle` with targeted waits
- [ ] Use data-testid attributes where selectors are brittle
- [ ] Add visual regression testing for key pages

## Acceptance Criteria

### Functional Requirements
- [ ] All existing 30 landing page tests pass (done)
- [ ] Auth flow tests pass: sign-up, sign-in, sign-out, password reset
- [ ] Agent CRUD tests pass: create, read, update, delete
- [ ] Agent chat tests pass with real LLM response (Workers AI)
- [ ] Tool CRUD tests pass: create, read, update, delete
- [ ] Dashboard, analytics, usage pages render correctly
- [ ] Settings pages functional: profile, API keys, team
- [ ] Webhook CRUD tests pass
- [ ] Workspace/team management tests pass

### Non-Functional Requirements
- [ ] All tests pass on mobile (375px), tablet (768px), and desktop (1280px)
- [ ] No test uses `waitForTimeout()` — only explicit element/response waits
- [ ] Test suite completes in under 10 minutes locally
- [ ] Zero flaky tests (consistent pass on 3 consecutive runs)

## Implementation Order

1. **Fix existing test failures** — run each file, fix broken selectors
2. **Agent CRUD + Chat tests** — highest value real functionality
3. **Tool CRUD tests** — second-highest value
4. **Cross-device responsive tests** — ensure UI works everywhere
5. **Settings, webhooks, workspace tests** — complete coverage
6. **Consolidate duplicates** — reduce maintenance
7. **Quality improvements** — stability and speed

## Key File Paths

| Purpose | Path |
|---|---|
| Playwright config | `apps/web/playwright.config.ts` |
| E2E fixtures | `apps/web/e2e/fixtures.ts` |
| Global setup | `apps/web/e2e/global-setup.ts` |
| E2E test directory | `apps/web/e2e/` |
| Route definitions | `apps/web/src/routes/` |
| Page components | `packages/app/pages/` |
| API routers | `packages/api/src/orpc/routers/` |
| E2E wrangler config | `apps/web/wrangler.e2e.jsonc` |
| Testing package | `packages/testing/src/` |

## Sources & References

- CI Playwright fixes: `docs/plans/ci-playwright-fixes.md`
- Platform finalization plan: `docs/plans/2026-03-07-feat-finalize-hare-platform-plan.md`
- Testing guide: `TESTING.md`
- Current test status: `BLOCKING.md`
