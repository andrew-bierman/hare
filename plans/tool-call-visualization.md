# Tool Call Visualization - Implementation Plan

## Executive Summary

This plan details how to implement tool call visualization in the Hare Chat Playground. The feature will display tool calls with their names, input parameters, loading states, results, and error handling in collapsible/expandable blocks.

## Current State Analysis

### What Exists

1. **Type Definitions** (already defined in `/apps/web/src/lib/api/types.ts`):
```typescript
export interface ChatStreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error'
  content?: string
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolCallId?: string
  toolResult?: unknown
  isError?: boolean
  error?: string
}
```

2. **Database Types** (in `/apps/web/src/db/types.ts`):
```typescript
export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  output: unknown
  isError?: boolean
}
```

3. **Agent Tools**: 61+ tools defined across categories (KV, R2, SQL, HTTP, AI, etc.)

### What's Missing

1. **Backend**: Tool execution with SSE event streaming
2. **Frontend Hook**: Processing `tool_call` and `tool_result` events
3. **UI Components**: Tool call visualization blocks
4. **Collapsible Component**: Not in the current shadcn/ui setup

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PLAYGROUND PAGE                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    MESSAGE LIST                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ User Message                                              │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ Assistant Message                                         │    │   │
│  │  │  ┌─────────────────────────────────────────────────┐     │    │   │
│  │  │  │ ToolCallBlock (collapsible)                     │     │    │   │
│  │  │  │  - Tool Name & Badge                            │     │    │   │
│  │  │  │  - Input Parameters (JSON)                      │     │    │   │
│  │  │  │  - Loading/Status Indicator                     │     │    │   │
│  │  │  │  - Result or Error Display                      │     │    │   │
│  │  │  └─────────────────────────────────────────────────┘     │    │   │
│  │  │  Text content continues...                                │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Add Collapsible Component

**Step 1.1: Install Radix Collapsible**

```bash
bun add @radix-ui/react-collapsible
```

**Step 1.2: Create Collapsible Component**

**File**: `/packages/ui/src/components/collapsible.tsx`

```typescript
'use client'

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import type * as React from 'react'
import { cn } from '@workspace/ui/lib/utils'

const Collapsible = CollapsiblePrimitive.Root
const CollapsibleTrigger = CollapsiblePrimitive.Trigger

function CollapsibleContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      className={cn(
        'overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
        className
      )}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Content>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
```

### Phase 2: Extend Message Types

**File**: `/apps/web/src/lib/api/hooks/use-chat.ts`

```typescript
export interface ToolCallData {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'error'
  result?: unknown
  error?: string
  startedAt: string
  completedAt?: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: ToolCallData[]
  createdAt: string
}
```

### Phase 3: Create ToolCallBlock Component

**File**: `/apps/web/src/components/chat/tool-call-block.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Wrench,
  Clock,
  Code,
} from 'lucide-react'
import type { ToolCallData } from 'web-app/lib/api/hooks'

interface ToolCallBlockProps {
  toolCall: ToolCallData
}

// Tool category colors
const TOOL_CATEGORIES: Record<string, { color: string; icon: string }> = {
  http: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: 'globe' },
  sql: { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: 'database' },
  kv: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: 'key' },
  r2: { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: 'cloud' },
  ai: { color: 'bg-pink-500/10 text-pink-600 border-pink-500/20', icon: 'sparkles' },
  default: { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: 'wrench' },
}

function getToolCategory(name?: string): string {
  if (!name) {
    return 'default'
  }

  const lowerName = name.toLowerCase()

  // Basic heuristics to map tool names to known categories.
  if (
    lowerName.includes('db') ||
    lowerName.includes('database') ||
    lowerName.includes('sql') ||
    lowerName.includes('store') ||
    lowerName.includes('storage')
  ) {
    return 'sql'
  }

  if (
    lowerName.includes('http') ||
    lowerName.includes('fetch') ||
    lowerName.includes('request') ||
    lowerName.includes('api')
  ) {
    return 'http'
  }

  if (
    lowerName.includes('kv') ||
    lowerName.includes('key')
  ) {
    return 'kv'
  }

  if (
    lowerName.includes('r2') ||
    lowerName.includes('storage') ||
    lowerName.includes('object')
  ) {
    return 'r2'
  }

  if (
    lowerName.includes('ai') ||
    lowerName.includes('model') ||
    lowerName.includes('generate')
  ) {
    return 'ai'
  }

  return 'default'
}

function StatusIcon({ status }: { status: ToolCallData['status'] }) {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4 text-muted-foreground" />
    case 'running':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" />
  }
}

export function ToolCallBlock({ toolCall }: ToolCallBlockProps) {
  const [isOpen, setIsOpen] = useState(false)
  const category = getToolCategory(toolCall.name)
  const categoryStyle = TOOL_CATEGORIES[category] || TOOL_CATEGORIES.default

  const duration = toolCall.completedAt && toolCall.startedAt
    ? new Date(toolCall.completedAt).getTime() - new Date(toolCall.startedAt).getTime()
    : null

  return (
    <Card className="my-3 border-l-4 border-l-primary/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            <div className="flex items-center gap-2 flex-1">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{toolCall.name}</span>
              <Badge variant="outline" className={categoryStyle.color}>
                {category}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {duration !== null && (
                <span className="text-xs text-muted-foreground">
                  {duration}ms
                </span>
              )}
              <StatusIcon status={toolCall.status} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 space-y-3">
            {/* Input Parameters */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Code className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Input
                </span>
              </div>
              <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-[150px]">
                <code>{JSON.stringify(toolCall.args, null, 2)}</code>
              </pre>
            </div>

            {/* Loading State */}
            {toolCall.status === 'running' && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}

            {/* Result */}
            {toolCall.status === 'completed' && toolCall.result !== undefined && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Result
                  </span>
                </div>
                <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-[200px]">
                  <code>{JSON.stringify(toolCall.result, null, 2)}</code>
                </pre>
              </div>
            )}

            {/* Error */}
            {toolCall.status === 'error' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-xs font-medium text-destructive uppercase tracking-wider">
                    Error
                  </span>
                </div>
                <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                  {toolCall.error || 'Unknown error occurred'}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
```

### Phase 4: Update useChat Hook

Update SSE event handling to process tool_call and tool_result events:

```typescript
case 'tool_call':
  setMessages((prev) => {
    const updated = [...prev]
    const lastMessage = updated[updated.length - 1]
    if (lastMessage?.role === 'assistant') {
      const toolCall: ToolCallData = {
        id: event.toolCallId!,
        name: event.toolName!,
        args: event.toolArgs!,
        status: 'running',
        startedAt: new Date().toISOString(),
      }
      lastMessage.toolCalls = [...(lastMessage.toolCalls || []), toolCall]
    }
    return updated
  })
  break

case 'tool_result':
  setMessages((prev) => {
    const updated = [...prev]
    const lastMessage = updated[updated.length - 1]
    if (lastMessage?.role === 'assistant' && lastMessage.toolCalls) {
      const toolCall = lastMessage.toolCalls.find(
        (tc) => tc.id === event.toolCallId
      )
      if (toolCall) {
        toolCall.status = event.isError ? 'error' : 'completed'
        toolCall.result = event.toolResult
        if (event.isError) {
          toolCall.error = String(event.toolResult)
        }
        toolCall.completedAt = new Date().toISOString()
      }
    }
    return updated
  })
  break
```

### Phase 5: Integrate into Playground

Update message rendering in `/apps/web/src/app/(dashboard)/dashboard/agents/[id]/playground/page.tsx`:

```typescript
import { ToolCallList } from 'web-app/components/chat/tool-call-list'

// In the message rendering:
{message.role === 'assistant' && message.toolCalls && (
  <ToolCallList toolCalls={message.toolCalls} />
)}
```

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `/packages/ui/src/components/collapsible.tsx` | Create | Radix collapsible wrapper |
| `/apps/web/src/lib/api/hooks/use-chat.ts` | Modify | Handle tool call events |
| `/apps/web/src/components/chat/tool-call-block.tsx` | Create | Individual tool call UI |
| `/apps/web/src/components/chat/tool-call-list.tsx` | Create | List of tool calls |
| `/apps/web/src/app/(dashboard)/dashboard/agents/[id]/playground/page.tsx` | Modify | Integrate tool calls |
| `/apps/web/tailwind.config.ts` | Modify | Add collapsible animations |

## Dependencies

- `@radix-ui/react-collapsible`: For accessible collapsible UI

## Success Criteria

- [ ] Tool calls display with name and category badge
- [ ] Input parameters shown in collapsible JSON block
- [ ] Loading spinner during tool execution
- [ ] Result displayed with proper formatting
- [ ] Error states handled with red styling
- [ ] Execution duration shown
- [ ] Smooth expand/collapse animations
- [ ] Works with streaming SSE events

## Critical Files for Implementation

- `/apps/web/src/lib/api/routes/chat.ts` - Backend SSE streaming logic
- `/apps/web/src/lib/api/hooks/use-chat.ts` - Frontend hook for SSE processing
- `/apps/web/src/app/(dashboard)/dashboard/agents/[id]/playground/page.tsx` - Playground page
- `/apps/web/src/lib/agents/agent.ts` - EdgeAgent class with tool calling
- `/apps/web/src/lib/api/types.ts` - Type definitions for ChatStreamEvent
