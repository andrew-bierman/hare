# Visual Tool Picker Implementation Plan

## Executive Summary

This plan outlines the implementation of a Visual Tool Picker with drag-and-drop reordering for the Agent Builder UI. The picker will allow users to browse, search, and select tools from categorized views, with visual indicators for selection state and support for reordering selected tools.

## Current State Analysis

### Existing Tool Selection UI

Location: `/apps/web/src/app/(dashboard)/dashboard/agents/[id]/page.tsx` (lines 363-398)

Current implementation is a simple checkbox list:
- No categorization or filtering
- No search capability
- No drag-and-drop reordering
- Basic toggle with `handleToolToggle` function

### Tool Data Model

From `/apps/web/src/db/schema/tools.ts`:
```typescript
// tools table
{
  id: text('id'),
  workspaceId: text('workspaceId'),
  name: text('name'),
  description: text('description'),
  type: text('type'),  // enum: http, sql, kv, r2, vectorize, search, etc.
  config: text('config', { mode: 'json' }),
  createdBy: text('createdBy'),
  createdAt, updatedAt
}

// agent_tools junction table
{
  id: text('id'),
  agentId: text('agentId'),
  toolId: text('toolId'),
  createdAt
}
```

### Existing Tool Categories

From `/apps/web/src/lib/agents/tools/index.ts`:
- **storage**: KV, R2
- **database**: SQL (D1)
- **search**: Vectorize, semantic search
- **http**: HTTP requests
- **utility**: datetime, json, text, math, uuid, hash, base64, url, delay
- **integrations**: zapier, webhook
- **ai**: sentiment, summarize, translate, image_generate, classify, ner, embedding, qa
- **data**: rss, scrape, regex, crypto, json_schema, csv, template
- **sandbox**: code_execute, code_validate, sandbox_file
- **validation**: email, phone, url, credit_card, ip, json validators
- **transform**: markdown, diff, qrcode, compression, color

## Dependencies to Add

```bash
bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Component Architecture

```
apps/web/src/components/agent/
├── tool-picker/
│   ├── index.ts                 # Barrel export
│   ├── tool-picker.tsx          # Main container component
│   ├── tool-grid.tsx            # Available tools grid
│   ├── tool-card.tsx            # Individual tool card
│   ├── selected-tools.tsx       # Selected tools with drag-drop
│   ├── sortable-tool-item.tsx   # Draggable selected tool
│   ├── tool-search.tsx          # Search input component
│   ├── tool-categories.tsx      # Category filter tabs
│   ├── tool-detail-dialog.tsx   # Tool detail modal
│   └── use-tool-picker.ts       # Hook for picker state
```

## Component Specifications

### ToolPicker (Main Container)

```typescript
interface ToolPickerProps {
  workspaceId: string
  selectedToolIds: string[]
  onSelectionChange: (toolIds: string[]) => void
  maxTools?: number  // default: 20 (from AGENT_LIMITS.maxToolsPerAgent)
}
```

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│  Selected Tools (X/20)                              [Clear] │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                           │
│  │Tool1│ │Tool2│ │Tool3│ │Tool4│  (draggable, horizontal)  │
│  └─────┘ └─────┘ └─────┘ └─────┘                           │
├─────────────────────────────────────────────────────────────┤
│  [🔍 Search tools...]              [Category ▼] [Type ▼]   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  HTTP   │ │   SQL   │ │   KV    │ │   R2    │           │
│  │ Request │ │  Query  │ │ Storage │ │ Storage │           │
│  │    ☐    │ │    ☑    │ │    ☑    │ │    ☐    │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### ToolCard Component

```typescript
interface ToolCardProps {
  tool: Tool
  isSelected: boolean
  onToggle: () => void
  onViewDetails: () => void
}
```

**Visual States**:
- Default: Border muted, hover highlights
- Selected: Primary border, checkmark badge, subtle background
- Disabled: Reduced opacity (when max tools reached)
- System vs Custom: Different badge styling

### SelectedTools Component (Sortable)

```typescript
interface SelectedToolsProps {
  tools: Tool[]
  onRemove: (toolId: string) => void
  onReorder: (toolIds: string[]) => void
}
```

Uses @dnd-kit for drag-and-drop:
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
```

### useToolPicker Hook

```typescript
interface UseToolPickerOptions {
  workspaceId: string
  initialSelectedIds: string[]
  maxTools?: number
}

interface UseToolPickerReturn {
  // Data
  tools: Tool[]
  selectedTools: Tool[]
  filteredTools: Tool[]
  isLoading: boolean

  // State
  searchQuery: string
  activeCategory: ToolCategory | 'all'
  detailTool: Tool | null

  // Actions
  setSearchQuery: (query: string) => void
  setActiveCategory: (category: ToolCategory | 'all') => void
  toggleTool: (toolId: string) => void
  reorderTools: (toolIds: string[]) => void
  removeTool: (toolId: string) => void
  clearSelection: () => void
  openToolDetail: (tool: Tool) => void
  closeToolDetail: () => void

  // Derived
  isAtMaxTools: boolean
  toolCounts: Record<ToolCategory, number>
}
```

## Tool Categories

| Category | Icon | Tools |
|----------|------|-------|
| all | Layers | All Tools |
| storage | HardDrive | KV, R2 |
| database | Database | SQL |
| http | Globe | HTTP requests |
| search | Search | Vectorize |
| ai | Brain | Sentiment, summarize, translate, etc. |
| utility | Wrench | datetime, json, text, math, etc. |
| integrations | Plug | Zapier, webhook |
| data | FileCode | RSS, scrape, regex, etc. |
| sandbox | Code | code_execute, code_validate |
| validation | CheckCircle | Email, phone, URL validators |
| transform | RefreshCw | Markdown, diff, QR code, etc. |

## Implementation Phases

### Phase 1: Foundation (Day 1)
1. Add dnd-kit dependencies
2. Create tool category mapping
3. Create expanded tool icons mapping
4. Implement useToolPicker hook

### Phase 2: Core Components (Day 2)
1. Implement ToolCard component
2. Implement ToolSearch component
3. Implement ToolCategories component
4. Implement ToolGrid component

### Phase 3: Drag and Drop (Day 3)
1. Implement SortableToolItem component
2. Implement SelectedTools component with DndContext
3. Add drag-and-drop handlers

### Phase 4: Integration (Day 4)
1. Implement ToolDetailDialog
2. Assemble ToolPicker main container
3. Integrate with agent detail page
4. Integrate with new agent page

### Phase 5: Polish (Day 5)
1. Add loading states and skeletons
2. Add empty states
3. Add animations and transitions
4. Accessibility audit and fixes
5. Testing

## Styling

```css
/* Tool Card States */
.tool-card {
  @apply border rounded-lg p-4 cursor-pointer transition-all duration-200;
  @apply hover:border-primary/50 hover:bg-accent/50;
}

.tool-card-selected {
  @apply border-primary bg-primary/5 ring-2 ring-primary/20;
}

.tool-card-disabled {
  @apply opacity-50 cursor-not-allowed;
}

.tool-card-dragging {
  @apply shadow-lg scale-105 z-50 ring-2 ring-primary;
}

/* Selected Tools Bar */
.selected-tools-bar {
  @apply flex gap-2 p-3 rounded-lg bg-muted/30 border border-dashed;
  @apply min-h-[80px] overflow-x-auto;
}

.selected-tool-item {
  @apply flex items-center gap-2 px-3 py-2 rounded-md;
  @apply bg-background border shadow-sm cursor-grab active:cursor-grabbing;
}
```

## Integration with Agent Builder

Update `/apps/web/src/app/(dashboard)/dashboard/agents/[id]/page.tsx`:

```typescript
import { ToolPicker } from 'web-app/components/agent/tool-picker'

<TabsContent value="tools" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle>Agent Tools</CardTitle>
      <CardDescription>
        Select and configure tools to extend your agent's capabilities.
        Drag to reorder tool priority.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ToolPicker
        workspaceId={activeWorkspace?.id || ''}
        selectedToolIds={selectedToolIds}
        onSelectionChange={setSelectedToolIds}
        maxTools={20}
      />
    </CardContent>
  </Card>
</TabsContent>
```

## Accessibility Considerations

1. **Keyboard Navigation**:
   - Tab through tool cards
   - Enter/Space to toggle selection
   - Arrow keys to navigate within grid
   - Escape to close detail dialog

2. **Screen Reader Support**:
   - ARIA labels on all interactive elements
   - Live region for selection count updates
   - Announce drag-and-drop operations

3. **Focus Management**:
   - Focus trap in detail dialog
   - Return focus after dialog closes
   - Visible focus indicators

## Success Criteria

- [ ] Tools displayed in categorized grid
- [ ] Search filters tools in real-time
- [ ] Category tabs filter tools
- [ ] Click to select/deselect tools
- [ ] Selected tools show in horizontal bar
- [ ] Drag-and-drop reordering works
- [ ] Tool detail dialog shows full info
- [ ] Max tools limit enforced
- [ ] Mobile-friendly touch interactions

## Critical Files for Implementation

- `/apps/web/src/app/(dashboard)/dashboard/agents/[id]/page.tsx` - Current agent builder
- `/apps/web/src/lib/api/hooks/use-tools.ts` - Existing hooks for fetching tools
- `/apps/web/src/lib/agents/tools/index.ts` - Tool category definitions
- `/apps/web/src/app/(dashboard)/dashboard/tools/page.tsx` - Pattern for tool cards
- `/packages/ui/src/components/card.tsx` - shadcn/ui Card pattern
