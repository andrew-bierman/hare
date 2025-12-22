# Test Coverage Documentation

This document provides information about test coverage configuration and how to verify coverage targets.

## Coverage Configuration

The project uses Vitest with v8 coverage provider. Coverage configuration is defined in `vitest.config.ts`:

### Coverage Thresholds
- **Lines**: 90%
- **Functions**: 90%
- **Branches**: 90%
- **Statements**: 90%

### Coverage Exclusions
The following paths are excluded from coverage:
- `node_modules/**`
- `**/*.test.ts` and `**/*.spec.ts` (test files)
- `**/e2e/**` (e2e tests)
- `**/__tests__/**` (test directories)
- `**/*.config.ts` and `**/*.config.js` (configuration files)
- `**/types.ts` (type definition files)
- `**/db/schema/**` (database schema definitions)
- `**/db/client.ts` and `**/db/index.ts` (database setup files)
- `**/.next/**`, `**/dist/**`, `**/coverage/**` (build artifacts)

## Running Tests with Coverage

### Run all tests with coverage
```bash
npm run test:coverage
```

This will:
1. Run all unit tests
2. Generate coverage reports in multiple formats:
   - Text summary (console output)
   - JSON report (`coverage/coverage-final.json`)
   - HTML report (`coverage/index.html`)
   - LCOV report (`coverage/lcov.info`)

### View HTML Coverage Report
After running tests with coverage, open the HTML report:
```bash
open coverage/index.html
```

### Run tests without coverage
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

## Current Test Structure

### Unit Tests
Unit tests are located alongside the source files in `__tests__` directories:

```
apps/web/src/lib/
├── api/
│   ├── __tests__/
│   │   ├── health.test.ts
│   │   ├── models.test.ts
│   │   ├── schemas.test.ts
│   │   └── types.test.ts
│   ├── middleware/
│   │   └── __tests__/
│   │       ├── api-key.test.ts
│   │       └── workspace.test.ts
│   └── routes/
│       └── __tests__/
│           ├── agents.test.ts
│           ├── tools.test.ts
│           ├── usage.test.ts
│           └── workspaces.test.ts
├── agents/
│   ├── providers/
│   │   └── __tests__/
│   │       └── workers-ai.test.ts
│   └── tools/
│       └── __tests__/
│           └── factory.test.ts
└── db/
    └── __tests__/
        └── schema.test.ts

packages/ui/src/lib/
└── __tests__/
    └── utils.test.ts
```

### E2E Tests
End-to-end tests use Playwright and are located in:
- `apps/web/e2e/` - Web application e2e tests
- `packages/e2e/` - Shared e2e tests

Run e2e tests separately with:
```bash
npm run test:e2e
```

## Coverage Areas

### High Coverage Areas
The following areas have comprehensive test coverage:
- ✅ API schemas validation
- ✅ Middleware permission functions
- ✅ API model mapping
- ✅ Type validation functions
- ✅ Workers AI provider utilities
- ✅ UI utility functions (cn helper)

### Areas Requiring Additional Tests
The following areas would benefit from more comprehensive tests:
- 🔄 Agent tools (HTTP, SQL, KV, R2, Vectorize, etc.)
- 🔄 Agent memory functionality
- 🔄 Authentication utilities
- 🔄 API client hooks
- 🔄 Complex tool execution paths
- 🔄 Error handling edge cases

## Test Best Practices

### Writing Unit Tests
1. **Isolate tests**: Use mocks for external dependencies
2. **Test edge cases**: Include tests for null, undefined, empty values
3. **Test error paths**: Verify error handling works correctly
4. **Use descriptive names**: Test names should clearly describe what they test
5. **Group related tests**: Use `describe` blocks to organize tests

Example:
```typescript
describe('functionName', () => {
  it('handles valid input correctly', () => {
    expect(functionName('valid')).toBe('expected')
  })

  it('handles edge case', () => {
    expect(functionName(null)).toBe(null)
  })

  it('throws on invalid input', () => {
    expect(() => functionName('invalid')).toThrow()
  })
})
```

### Test File Naming
- Unit tests: `*.test.ts`
- E2E tests: `*.spec.ts`

## CI/CD Integration

Coverage reports are generated during CI/CD pipelines. The build will fail if coverage drops below configured thresholds.

## Contributing

When adding new code:
1. Write tests for all new functions and classes
2. Aim for >90% coverage of your changes
3. Run `npm run test:coverage` before submitting PR
4. Review coverage report to identify untested code paths

## Troubleshooting

### Coverage not generating
1. Ensure `@vitest/coverage-v8` is installed
2. Check vitest.config.ts for correct coverage configuration
3. Verify no syntax errors in test files

### Tests failing in CI but passing locally
1. Check for test interdependencies
2. Verify all dependencies are properly mocked
3. Ensure tests don't rely on system-specific paths

### Low coverage warnings
1. Review HTML coverage report to identify untested files
2. Add tests for critical paths first
3. Consider if some files should be excluded from coverage

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
- [Playwright Documentation](https://playwright.dev/)
