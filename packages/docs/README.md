# @hare/docs

Documentation generation and content for Hare.

## Features

- TypeScript AST-based documentation generator
- Auto-extracts JSDoc comments, interfaces, classes, and functions
- Parses Zod schemas from `createTool()` calls
- Generates MDX documentation files

## Usage

### Generate Documentation

From the monorepo root:

```bash
bun run packages/docs/src/cli.ts --verbose
```

Or from the web app:

```bash
cd apps/web
bun run docs:generate
```

This will:
1. Parse TypeScript source files in `@hare/agent` and `@hare/tools`
2. Generate MDX documentation in `packages/docs/content/_generated/`
3. Copy the generated files to `apps/web/content/sdk/_generated/`

### Programmatic Usage

```ts
import { generateDocs, extractDocsFromFile, type PackageConfig } from '@hare/docs'

// Extract docs from a single file
const docs = extractDocsFromFile('/path/to/file.ts')

// Generate docs for multiple packages
await generateDocs({
  packages: [
    {
      name: '@hare/agent',
      path: 'packages/agent/src',
      outputFile: 'content/agent.mdx',
      title: 'Agent SDK Reference',
      description: 'API documentation for @hare/agent',
    },
  ],
  baseDir: '/path/to/monorepo',
  verbose: true,
})
```

## Generated Content

The generator extracts:

- **Classes**: Public classes with their properties and methods
- **Interfaces**: Exported interfaces with property documentation
- **Functions**: Exported function signatures with JSDoc
- **Tools**: Tool definitions created with `createTool()`, including Zod schema parameters

## Configuration

The default configuration in `src/cli.ts` generates docs for:

- `@hare/agent` → `packages/docs/content/_generated/agent.mdx`
- `@hare/tools` → `packages/docs/content/_generated/tools.mdx`
