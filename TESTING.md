# Testing Guide

This document covers the testing infrastructure, conventions, and best practices for the Hare project.

## Test Status

[![Unit Tests](https://github.com/andrew-bierman/hare/actions/workflows/ci.yml/badge.svg)](https://github.com/andrew-bierman/hare/actions/workflows/ci.yml)

## Overview

Hare uses a comprehensive testing strategy with:
- **Vitest** for unit and integration tests
- **Playwright** for end-to-end (E2E) tests
- **Cloudflare Workers Vitest Pool** for testing Workers-specific code

## Quick Start

```bash
# Run all unit tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run E2E tests
bun run test:e2e

# Open Vitest UI
bun run test:ui
```

## Test Structure

### Directory Layout

```
hare/
├── packages/
│   ├── agent/src/__tests__/          # Agent package unit tests
│   ├── api/src/
│   │   ├── __tests__/                # API package unit tests
│   │   ├── middleware/__tests__/     # Middleware tests
│   │   ├── routes/__tests__/         # Route handler tests
│   │   └── utils/__tests__/          # Utility function tests
│   ├── auth/src/__tests__/           # Auth package tests
│   ├── db/src/__tests__/             # Database schema tests
│   ├── security/src/__tests__/       # Security module tests
│   ├── tools/src/__tests__/          # Tool implementation tests
│   ├── ui/src/lib/__tests__/         # UI utility tests
│   └── testing/src/                  # Shared test utilities
│       ├── factories/                # Test data factories
│       ├── mocks/                    # Mock implementations
│       └── seeds/                    # Database seeding utilities
├── apps/web/e2e/                     # E2E tests
│   ├── fixtures.ts                   # Playwright fixtures
│   └── *.e2e.ts                      # E2E test files
└── vitest.config.ts                  # Vitest configuration
```

### Naming Conventions

| Test Type | File Pattern | Location |
|-----------|--------------|----------|
| Unit tests | `*.test.ts` | `__tests__/` directory alongside source |
| Integration tests | `*.integration.test.ts` | `__tests__/` directory |
| E2E tests | `*.e2e.ts` | `apps/web/e2e/` |

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all tests once
bun run test

# Run in watch mode (auto-rerun on changes)
bun run test:watch

# Run specific test file
bun run test packages/api/src/__tests__/schemas.test.ts

# Run tests matching a pattern
bun run test --filter "agent"

# Run with coverage report
bun run test:coverage

# Open Vitest UI for interactive testing
bun run test:ui
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
bun run test:e2e

# Run E2E tests in the apps/web directory
cd apps/web && bunx playwright test

# Run specific E2E test file
cd apps/web && bunx playwright test e2e/auth.e2e.ts

# Run in headed mode (see browser)
cd apps/web && bunx playwright test --headed

# Run with debug mode
cd apps/web && bunx playwright test --debug

# View last test report
cd apps/web && bunx playwright show-report
```

## Writing Tests

### Unit Test Example

```typescript
// packages/api/src/__tests__/example.test.ts
import { describe, expect, it, beforeEach } from 'vitest'

describe('ExampleService', () => {
  beforeEach(() => {
    // Setup before each test
  })

  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = someFunction(input)

      // Assert
      expect(result).toBe('expected')
    })

    it('should handle edge cases', () => {
      expect(() => someFunction(null)).toThrow('Expected error message')
    })
  })
})
```

### Integration Test Example

```typescript
// packages/api/src/routes/__tests__/agents.test.ts
import { describe, expect, it, beforeEach } from 'vitest'
import { env, createExecutionContext } from 'cloudflare:test'
import { seedAgent, cleanupSeededData } from '@hare/testing'

describe('Agents Route', () => {
  beforeEach(async () => {
    await cleanupSeededData(env.DB)
  })

  it('should create an agent', async () => {
    const { user, workspace } = await seedAgent(env.DB)

    // Test your route handler
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-ID': workspace.id,
      },
      body: JSON.stringify({ name: 'Test Agent' }),
    })

    expect(response.status).toBe(201)
  })
})
```

### E2E Test Example

```typescript
// apps/web/e2e/example.e2e.ts
import { test, expect } from './fixtures'

test.describe('Feature Name', () => {
  test('should complete user flow', async ({ authenticatedPage }) => {
    // authenticatedPage is already signed in
    await authenticatedPage.goto('/dashboard/agents')

    // Click create button
    await authenticatedPage.getByRole('button', { name: 'Create Agent' }).click()

    // Fill form
    await authenticatedPage.getByLabel('Name').fill('My Agent')

    // Submit and verify
    await authenticatedPage.getByRole('button', { name: 'Create' }).click()
    await expect(authenticatedPage).toHaveURL(/\/dashboard\/agents\//)
  })

  test('unauthenticated user sees public page', async ({ page }) => {
    // page is not authenticated
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Hare' })).toBeVisible()
  })
})
```

## Test Fixtures and Factories

### Using Factories

The `@hare/testing` package provides factories for creating test data:

```typescript
import {
  createTestUser,
  createTestWorkspace,
  createTestAgent,
  createTestTool,
  createTestWebhook,
  resetAllFactoryCounters,
} from '@hare/testing'

// Create a test user
const user = createTestUser({ name: 'Custom Name' })

// Create a workspace
const workspace = createTestWorkspace({
  ownerId: user.id,
  name: 'Test Workspace'
})

// Create an agent with required fields
const agent = createTestAgent({
  workspaceId: workspace.id,
  createdBy: user.id,
  status: 'deployed',
})

// Create multiple items
const agents = createTestAgents(5, {
  workspaceId: workspace.id,
  createdBy: user.id,
})

// Reset counters between tests for isolation
beforeEach(() => {
  resetAllFactoryCounters()
})
```

### Available Factories

| Factory | Description |
|---------|-------------|
| `createTestUser(overrides)` | Creates a test user |
| `createTestUsers(count, overrides)` | Creates multiple users |
| `createTestWorkspace(overrides)` | Creates a workspace |
| `createTestWorkspaceMember(overrides)` | Creates a workspace member |
| `createTestAgent(overrides)` | Creates an agent (requires `workspaceId`, `createdBy`) |
| `createTestAgentVersion(overrides)` | Creates an agent version |
| `createTestTool(overrides)` | Creates a tool |
| `createTestHttpTool(overrides)` | Creates an HTTP tool |
| `createTestCustomTool(overrides)` | Creates a custom tool |
| `createTestWebhook(overrides)` | Creates a webhook |
| `createTestWebhookLog(overrides)` | Creates a webhook log |

### Using Mocks

Mock Cloudflare bindings for testing:

```typescript
import {
  createMockEnv,
  createMockKV,
  createMockR2,
  createMockD1,
  createMockAI,
} from '@hare/testing'

// Create a complete mock environment
const env = createMockEnv({
  kvData: { 'session:123': JSON.stringify({ userId: 'user_1' }) },
  aiResponses: {
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast': { response: 'Hello!' }
  },
})

// Or create individual mocks
const kv = createMockKV({ 'key': 'value' })
const r2 = createMockR2()
const db = createMockD1()
const ai = createMockAI()
```

### Using Seeds

Seed the database with related test data:

```typescript
import {
  seedWorkspace,
  seedAgent,
  seedAgentWithTools,
  seedAgentWithWebhooks,
  seedCompleteEnvironment,
  cleanupSeededData,
} from '@hare/testing'

// Seed a workspace with owner
const { user, workspace, member } = await seedWorkspace(db)

// Seed an agent (creates user, workspace, and agent)
const { user, workspace, agent } = await seedAgent(db)

// Seed agent with tools attached
const { user, workspace, agent, tools, agentTools } = await seedAgentWithTools(db, {
  toolCount: 3,
})

// Seed agent with webhooks
const { user, workspace, agent, webhooks } = await seedAgentWithWebhooks(db)

// Seed complete environment for comprehensive testing
const data = await seedCompleteEnvironment(db, {
  agentCount: 3,
  toolsPerAgent: 2,
  webhookCount: 5,
})

// Clean up after tests
await cleanupSeededData(db)
```

### E2E Fixtures

The `apps/web/e2e/fixtures.ts` provides Playwright fixtures:

```typescript
import { test, expect, signUpViaUI, signInViaUI, generateTestUser } from './fixtures'

// Use testUser fixture for unique user per test
test('example', async ({ page, testUser }) => {
  // testUser has unique email/name to avoid conflicts
  await signUpViaUI(page, testUser)
})

// Use authenticatedPage for pre-authenticated tests
test('authenticated test', async ({ authenticatedPage }) => {
  // Page is already signed in with a test user
  await authenticatedPage.goto('/dashboard')
})

// Generate test users manually
const user = generateTestUser()
// { email: 'test-uuid@example.com', password: '...', name: 'Test User abc123' }
```

## Test Configuration

### Vitest Configuration

The root `vitest.config.ts` configures:
- Cloudflare Workers pool for edge runtime testing
- Path aliases matching the project structure
- Coverage thresholds (90% for lines, functions, branches, statements)
- Test file patterns and exclusions

Key configuration:

```typescript
// vitest.config.ts
export default defineWorkersConfig({
  test: {
    globals: true,
    include: ['apps/**/*.test.ts', 'packages/**/*.test.ts'],
    exclude: ['node_modules/**', 'e2e/**', '**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
  },
})
```

### Playwright Configuration

The `apps/web/playwright.config.ts` configures:
- Test directory and file matching (`*.e2e.ts`)
- Browser settings (Chromium)
- Web server startup for tests
- Retry policy (2 retries in CI)
- Screenshot and video capture on failure

## Coverage

### Running Coverage Reports

```bash
# Generate coverage report
bun run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Thresholds

The project maintains **90% coverage thresholds** for:
- Lines
- Functions
- Branches
- Statements

### Coverage Reports

Reports are generated in multiple formats:
- **Text**: Console summary
- **HTML**: `coverage/index.html` - interactive browser report
- **JSON**: `coverage/coverage-final.json` - for programmatic access
- **LCOV**: `coverage/lcov.info` - for CI integration

## CI Integration

Tests run automatically on every PR via GitHub Actions:

### Workflow Jobs

1. **Lint** - Runs Biome linter
2. **Type Check** - TypeScript type checking
3. **Unit Tests** - Runs `bun run test:coverage` with coverage reporting
4. **E2E Tests** - Runs Playwright tests with Chromium
5. **Test Notify** - Reports overall test status

### Parallel Execution

- All CI jobs (lint, typecheck, unit-tests, e2e-tests) run in parallel as separate GitHub Actions jobs
- This provides fast feedback by running different check types simultaneously
- Unit tests run sequentially within the job to avoid D1 database locking issues
- E2E tests run sequentially for consistent test isolation

### Test Artifacts

- **coverage-report** - Coverage reports (HTML, JSON, LCOV) retained for 30 days
- **playwright-report** - Playwright HTML report retained for 30 days
- **playwright-traces** - Test traces on failure retained for 7 days

### Test Failure Handling

- Unit test failures block PR merging
- E2E test failures include screenshots and traces
- Coverage reports are uploaded to Codecov for analysis
- The `test-notify` job reports overall status

## Best Practices

### Test Organization

1. **Co-locate tests with source code** - Place `__tests__/` directories alongside the code being tested
2. **One test file per module** - Match test files to source files (e.g., `agent.ts` → `agent.test.ts`)
3. **Use descriptive test names** - Start with "should" and describe expected behavior
4. **Group related tests** - Use `describe` blocks to organize tests by feature/method

### Test Isolation

1. **Reset factory counters** - Call `resetAllFactoryCounters()` in `beforeEach`
2. **Clean up database** - Use `cleanupSeededData()` between integration tests
3. **Use unique test data** - Use `generateTestUser()` for E2E tests
4. **Avoid test interdependence** - Each test should be able to run independently

### Assertions

1. **Be specific** - Test exact values, not just truthy/falsy
2. **Test error cases** - Verify error messages and types
3. **Use appropriate matchers** - `toBe` for primitives, `toEqual` for objects
4. **Assert on important properties** - Don't over-test implementation details

### Async Testing

1. **Always await async operations** - Use `await` for all promises
2. **Use proper timeouts** - Set reasonable timeouts for E2E tests
3. **Handle race conditions** - Wait for elements to be visible before interacting

### Mocking

1. **Mock at boundaries** - Mock external services, not internal implementation
2. **Use factory data** - Prefer factories over hardcoded test data
3. **Verify mock calls** - Assert that mocks were called with expected arguments
4. **Reset mocks between tests** - Prevent state leakage

## Troubleshooting

### Common Issues

**Tests fail with "Database locked"**
- Ensure `singleWorker: true` in vitest config
- Use `cleanupSeededData()` between tests

**E2E tests timeout**
- Increase timeout in test or config
- Check if dev server is starting properly
- Verify network conditions

**Coverage below threshold**
- Add tests for uncovered branches
- Check coverage report for specific files
- Consider if code is dead/unreachable

**Flaky E2E tests**
- Add explicit waits for elements
- Use `waitForLoadState('networkidle')`
- Check for race conditions in async operations

### Debug Mode

```bash
# Run Vitest with verbose output
bun run test --reporter=verbose

# Run Playwright with debug mode
cd apps/web && bunx playwright test --debug

# Run Playwright with headed browser
cd apps/web && bunx playwright test --headed

# Generate Playwright trace
cd apps/web && bunx playwright test --trace on
```

## Adding New Tests

### For a New Feature

1. Create test file in appropriate `__tests__/` directory
2. Import from `vitest` and `@hare/testing`
3. Write tests following the patterns above
4. Run tests locally before pushing
5. Ensure coverage thresholds are maintained

### For E2E Tests

1. Create `*.e2e.ts` file in `apps/web/e2e/`
2. Import fixtures from `./fixtures`
3. Use `authenticatedPage` for authenticated flows
4. Add appropriate waits and assertions
5. Test both success and error cases

### For New Test Utilities

1. Add to `packages/testing/src/`
2. Export from appropriate barrel file
3. Document usage in this guide
4. Add tests for the utility itself
