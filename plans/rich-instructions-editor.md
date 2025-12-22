# Rich Instructions Editor Implementation Plan

## Executive Summary

This plan details the implementation of a Rich Instructions Editor for the Hare Agent Builder UI. The editor will replace the current basic `<Textarea>` component with a feature-rich code editor supporting syntax highlighting, template variables, markdown support, and character/token counting.

## Current State Analysis

### How Instructions Are Currently Handled

**Database Storage:**
- Instructions are stored as plain `text` in the `agents` table (`/apps/web/src/db/schema/agents.ts`, line 15)
- Maximum length is defined as 10,000 characters in `AGENT_LIMITS.instructionsMaxLength` (`/apps/web/src/config/index.ts`, line 233)

**Current UI Implementation:**
- Agent Builder Page (`/apps/web/src/app/(dashboard)/dashboard/agents/[id]/page.tsx`, lines 338-361):
  - Uses basic `<Textarea>` component with `h-64 font-mono text-sm` classes
  - Controlled component with `useState` for `instructions`
  - No character counting, validation, or syntax highlighting

- New Agent Page (`/apps/web/src/app/(dashboard)/dashboard/agents/new/page.tsx`, lines 141-153):
  - Uses `<Textarea>` with `h-32 font-mono text-sm` classes
  - Same basic pattern, smaller height

### Existing Component Patterns

The codebase follows these patterns:
- UI primitives in `@workspace/ui` package with exports via `components/*.tsx`
- `cn()` utility for Tailwind class merging
- Controlled form inputs with React state
- Card-based layout sections
- Toast notifications via `sonner`

## Technology Recommendation: CodeMirror 6

**Recommendation: Use CodeMirror 6 over Monaco Editor**

| Factor | CodeMirror 6 | Monaco Editor |
|--------|--------------|---------------|
| Bundle Size | ~150KB | ~2MB |
| React Integration | Excellent (@uiw/react-codemirror) | Fair (@monaco-editor/react) |
| Performance | Lightweight, mobile-friendly | Heavy, desktop-focused |
| Customization | Highly modular | Monolithic |
| Markdown Support | Built-in language pack | Requires configuration |
| Edge Compatibility | Works in Workers | Some features fail |

**Package Selection:**
```json
{
  "@uiw/react-codemirror": "^4.21.21",
  "@codemirror/lang-markdown": "^6.2.0",
  "@codemirror/language-data": "^6.3.1",
  "gpt-tokenizer": "^2.1.2"
}
```

## Architecture Design

### Component Structure

```
packages/ui/src/components/
  instructions-editor/
    index.ts                    # Re-exports
    instructions-editor.tsx      # Main editor component
    toolbar.tsx                  # Editor toolbar
    template-variables.tsx       # Template variable highlighting
    use-token-count.ts           # Token counting hook
    types.ts                     # TypeScript interfaces

apps/web/src/components/agent/
  agent-instructions-editor.tsx  # Agent-specific wrapper
  template-variable-picker.tsx   # UI for inserting variables
```

### Component API Design

```typescript
// packages/ui/src/components/instructions-editor/types.ts
export interface InstructionsEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  maxHeight?: string
  maxLength?: number
  showLineNumbers?: boolean
  showToolbar?: boolean
  templateVariables?: TemplateVariable[]
  onTokenCountChange?: (count: number) => void
  className?: string
  disabled?: boolean
}

export interface TemplateVariable {
  name: string
  description: string
  example?: string
  category?: string
}

export interface EditorStats {
  characters: number
  words: number
  lines: number
  tokens: number
}
```

## Detailed Implementation Steps

### Phase 1: Core Editor Component (2-3 days)

#### Step 1.1: Install Dependencies

```bash
cd apps/web
bun add @uiw/react-codemirror @codemirror/lang-markdown @codemirror/language-data gpt-tokenizer
```

#### Step 1.2: Create Base Editor Component

**File: `/packages/ui/src/components/instructions-editor/instructions-editor.tsx`**

Key implementation details:
1. Use `@uiw/react-codemirror` as the base
2. Configure markdown language support
3. Apply shadcn/ui theming via CSS variables
4. Implement controlled component pattern matching existing Textarea

```typescript
'use client'

import { useMemo, useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import { cn } from '@workspace/ui/lib/utils'
import type { InstructionsEditorProps } from './types'

export function InstructionsEditor({
  value,
  onChange,
  placeholder = 'Write your agent instructions...',
  minHeight = '200px',
  maxHeight = '500px',
  showLineNumbers = true,
  disabled = false,
  className,
}: InstructionsEditorProps) {
  const extensions = useMemo(() => [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto' },
    }),
  ], [])

  const handleChange = useCallback((val: string) => {
    onChange(val)
  }, [onChange])

  return (
    <div className={cn(
      'border rounded-md overflow-hidden',
      'focus-within:ring-2 focus-within:ring-ring',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}>
      <CodeMirror
        value={value}
        onChange={handleChange}
        extensions={extensions}
        placeholder={placeholder}
        editable={!disabled}
        basicSetup={{
          lineNumbers: showLineNumbers,
          foldGutter: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
        }}
        style={{ minHeight, maxHeight }}
      />
    </div>
  )
}
```

#### Step 1.3: Create Token Counting Hook

**File: `/packages/ui/src/components/instructions-editor/use-token-count.ts`**

```typescript
'use client'

import { useState, useEffect, useMemo } from 'react'
import { encode } from 'gpt-tokenizer'

export interface TokenCountResult {
  tokens: number
  characters: number
  words: number
  lines: number
  isLoading: boolean
}

export function useTokenCount(
  text: string,
  debounceMs = 300
): TokenCountResult {
  const [tokens, setTokens] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Synchronous calculations
  const stats = useMemo(() => ({
    characters: text.length,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    lines: text.split('\n').length,
  }), [text])

  // Debounced token counting (expensive operation)
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      try {
        const encoded = encode(text)
        setTokens(encoded.length)
      } catch {
        setTokens(0)
      }
      setIsLoading(false)
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [text, debounceMs])

  return { tokens, isLoading, ...stats }
}
```

### Phase 2: Template Variable Support (1-2 days)

#### Step 2.1: Create Template Variable Highlighting Extension

**File: `/packages/ui/src/components/instructions-editor/template-variables.tsx`**

```typescript
import { ViewPlugin, Decoration, type DecorationSet, EditorView } from '@codemirror/view'

// Regex to match {{variable_name}} patterns
const TEMPLATE_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g

export const templateVariableTheme = EditorView.baseTheme({
  '.cm-template-variable': {
    backgroundColor: 'hsl(var(--primary) / 0.1)',
    color: 'hsl(var(--primary))',
    padding: '1px 4px',
    borderRadius: '4px',
    fontWeight: '500',
  },
})

function findTemplateVariables(text: string): Array<{ from: number; to: number; name: string }> {
  const matches: Array<{ from: number; to: number; name: string }> = []
  let match: RegExpExecArray | null

  while ((match = TEMPLATE_REGEX.exec(text)) !== null) {
    matches.push({
      from: match.index,
      to: match.index + match[0].length,
      name: match[1],
    })
  }

  return matches
}

export const templateVariableHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const text = view.state.doc.toString()
      const matches = findTemplateVariables(text)

      const decorations = matches.map(({ from, to }) =>
        Decoration.mark({
          class: 'cm-template-variable',
        }).range(from, to)
      )

      return Decoration.set(decorations)
    }
  },
  { decorations: (v) => v.decorations }
)
```

### Phase 3: Editor Toolbar and Stats (1 day)

See full implementation in component files.

### Phase 4: Integration with Agent Pages (1 day)

Update Agent Builder Page at `/apps/web/src/app/(dashboard)/dashboard/agents/[id]/page.tsx`:

```typescript
// Replace the Prompt tab content with:
<TabsContent value="prompt" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle>System Prompt</CardTitle>
      <CardDescription>
        Define how your agent behaves and responds. Use template variables
        like {'{{user_name}}'} for dynamic content.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <AgentInstructionsEditor
        value={instructions}
        onChange={setInstructions}
        disabled={updateAgent.isPending}
      />
    </CardContent>
  </Card>
</TabsContent>
```

## Dependencies to Add

```json
// apps/web/package.json
{
  "dependencies": {
    "@uiw/react-codemirror": "^4.21.21",
    "@codemirror/lang-markdown": "^6.2.0",
    "@codemirror/language-data": "^6.3.1",
    "gpt-tokenizer": "^2.1.2"
  }
}
```

## Estimated Timeline

| Phase | Description | Duration |
|-------|-------------|----------|
| 1 | Core Editor Component | 2-3 days |
| 2 | Template Variable Support | 1-2 days |
| 3 | Toolbar and Stats | 1 day |
| 4 | Integration with Agent Pages | 1 day |
| 5 | Theme Integration | 0.5 days |
| 6 | Testing and Documentation | 0.5 days |
| **Total** | | **6-8 days** |

## Success Criteria

- [ ] Editor renders with markdown syntax highlighting
- [ ] Template variables (`{{name}}`) are visually highlighted
- [ ] Character count updates in real-time
- [ ] Token count updates with debounce
- [ ] Toolbar provides markdown formatting shortcuts
- [ ] Dark mode works seamlessly
- [ ] Integration with existing agent pages is non-breaking
- [ ] Performance: No lag with 10,000 character documents
- [ ] Tests pass with >80% coverage

## Critical Files for Implementation

- `/apps/web/src/app/(dashboard)/dashboard/agents/[id]/page.tsx` - Primary integration point
- `/apps/web/src/app/(dashboard)/dashboard/agents/new/page.tsx` - Secondary integration point
- `/packages/ui/src/components/textarea.tsx` - Existing component pattern to follow
- `/apps/web/src/config/index.ts` - Contains AGENT_LIMITS.instructionsMaxLength
