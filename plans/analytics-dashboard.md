# Analytics Dashboard Implementation Plan

## Executive Summary

This plan details the implementation of an Analytics Dashboard with charts and visualizations for the Hare platform. The dashboard will display token usage over time, usage breakdown by agent, request metrics, cost estimates, and support date range filtering with export capabilities.

## Current State Analysis

### What Exists

1. **Database Schema** (`/apps/web/src/db/schema/usage.ts`):
   - `usage` table tracks: `id`, `workspaceId`, `agentId`, `userId`, `type`, `inputTokens`, `outputTokens`, `totalTokens`, `cost`, `metadata` (JSON with model, endpoint, duration, statusCode), `createdAt`

2. **API Routes** (`/apps/web/src/lib/api/routes/usage.ts`):
   - `GET /api/usage` - Workspace usage with `byAgent` and `byDay` aggregations
   - `GET /api/usage/agents/:id` - Agent-specific usage with `byModel` and `byDay` aggregations

3. **React Hooks** (`/apps/web/src/lib/api/hooks/use-usage.ts`):
   - `useUsage(workspaceId, params)` - Workspace usage with date filtering
   - `useUsageByAgent(workspaceId)` - Usage grouped by agent
   - `useAgentUsage(agentId, workspaceId)` - Single agent usage

4. **Current Usage Page** (`/apps/web/src/app/(dashboard)/dashboard/usage/page.tsx`):
   - Simple stat cards (Total API Calls, Total Tokens, Active Agents, Period)
   - Token breakdown (input vs output)
   - Basic agent list (no actual usage data per agent)

5. **CSS Variables** (`/packages/ui/src/styles/globals.css`):
   - Chart colors already defined: `--chart-1` through `--chart-5`

6. **Model Pricing Data** (`/apps/web/src/config/index.ts`):
   - `AI_MODELS` array with `inputCostPer1M` and `outputCostPer1M` for cost calculations

### What Needs to Be Built

- Token usage over time (line chart)
- Usage breakdown by agent (bar/pie chart)
- Request count and latency metrics
- Cost estimates based on token usage
- Date range filtering
- Export capabilities

## Dependencies

```bash
bun add recharts
```

## Component Structure

```
apps/web/src/
  app/(dashboard)/dashboard/
    analytics/
      page.tsx                    # Main analytics page
      loading.tsx                 # Loading skeleton
  components/
    charts/
      index.ts                    # Re-exports
      chart-container.tsx         # Wrapper with loading/empty states
      token-usage-chart.tsx       # Line chart for tokens over time
      agent-breakdown-chart.tsx   # Bar/pie chart for agent usage
      cost-trend-chart.tsx        # Area chart for cost trends
      latency-chart.tsx           # Line chart for latency metrics
      model-usage-chart.tsx       # Pie chart for model distribution
    analytics/
      date-range-picker.tsx       # Date range selector
      agent-filter.tsx            # Agent filter dropdown
      export-button.tsx           # Export dropdown menu
      stat-card.tsx               # Enhanced stat card with trend
  lib/
    api/
      routes/
        analytics.ts              # New analytics API route
      hooks/
        use-analytics.ts          # Analytics data hook
    utils/
      export.ts                   # CSV/JSON export utilities
      cost-calculator.ts          # Cost calculation helpers
```

## Implementation Phases

### Phase 1: Install Recharts and Add Chart Components

**Step 1.1: Add Recharts dependency**

```bash
cd apps/web
bun add recharts
```

**Step 1.2: Create reusable ChartContainer**

```typescript
// apps/web/src/components/charts/chart-container.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import type { ReactNode } from 'react'

interface ChartContainerProps {
  title: string
  description?: string
  isLoading?: boolean
  isEmpty?: boolean
  emptyMessage?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}

export function ChartContainer({
  title,
  description,
  isLoading,
  isEmpty,
  emptyMessage = 'No data available',
  children,
  action,
  className,
}: ChartContainerProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : isEmpty ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
```

### Phase 2: Create Analytics API Route

**File**: `/apps/web/src/lib/api/routes/analytics.ts`

```typescript
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { getDb } from '../db'
import { usage, agents } from 'web-app/db/schema'
import { authMiddleware, workspaceMiddleware } from '../middleware'

const getAnalyticsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Analytics'],
  summary: 'Get comprehensive analytics data',
  request: {
    query: z.object({
      workspaceId: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      agentId: z.string().optional(),
      groupBy: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
    }),
  },
  responses: {
    200: { description: 'Analytics data' },
    401: { description: 'Unauthorized' },
  },
})

// Returns:
// - summary: totalRequests, totalInputTokens, totalOutputTokens, totalCost, avgLatencyMs
// - timeSeries: date, inputTokens, outputTokens, requests, cost, avgLatency
// - byAgent: agentId, agentName, requests, inputTokens, outputTokens, cost
// - byModel: model, modelName, requests, inputTokens, outputTokens, cost
```

### Phase 3: Create Analytics Hook

**File**: `/apps/web/src/lib/api/hooks/use-analytics.ts`

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

export interface AnalyticsParams {
  startDate?: string
  endDate?: string
  agentId?: string
  groupBy?: 'hour' | 'day' | 'week' | 'month'
}

export function useAnalytics(workspaceId: string | undefined, params?: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', workspaceId, params],
    queryFn: () => apiClient.analytics.get(workspaceId!, params),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}
```

### Phase 4: Build Analytics Dashboard Page

**File**: `/apps/web/src/app/(dashboard)/dashboard/analytics/page.tsx`

Key features:
- Date range selector (7d, 30d, 90d, custom)
- Agent filter dropdown
- Summary stat cards with trends
- Token usage line chart
- Agent breakdown bar chart
- Model usage pie chart
- Cost trend area chart
- Export dropdown (CSV, JSON)

### Phase 5: Add Export Functionality

**File**: `/apps/web/src/lib/utils/export.ts`

```typescript
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

export function exportToJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`
  link.click()
}
```

### Phase 6: Update Navigation

Update `/apps/web/src/components/layout/sidebar.tsx` to add Analytics link:

```typescript
const routes = [
  { label: 'Dashboard', icon: Home, href: '/dashboard' },
  { label: 'Agents', icon: Bot, href: '/dashboard/agents' },
  { label: 'Tools', icon: Wrench, href: '/dashboard/tools' },
  { label: 'Analytics', icon: BarChart3, href: '/dashboard/analytics' }, // New
  { label: 'Usage', icon: Activity, href: '/dashboard/usage' },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
]
```

## Chart Specifications

### 1. Token Usage Over Time (Line Chart)
- X-axis: Date/time
- Y-axis: Token count
- Lines: Input tokens (blue), Output tokens (green), Total (purple)
- Tooltip: Date, token breakdown, requests

### 2. Usage by Agent (Bar Chart)
- Horizontal bars sorted by total usage
- Stacked colors for input vs output tokens
- Click to filter to specific agent

### 3. Model Usage Distribution (Pie Chart)
- Show percentage of tokens by AI model
- Hover for exact counts and cost

### 4. Cost Trend (Area Chart)
- Stacked area showing cost accumulation
- Projected cost based on current rate

### 5. Latency Metrics (Line Chart)
- Average response time over period
- P50, P95 if available

## Date Range Options

```typescript
const DATE_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
]
```

## Success Criteria

- [ ] Analytics page loads with charts
- [ ] Token usage line chart renders correctly
- [ ] Agent breakdown bar chart shows all agents
- [ ] Date range filtering works
- [ ] Agent filtering works
- [ ] Cost estimates display accurately
- [ ] Export to CSV works
- [ ] Export to JSON works
- [ ] Responsive on mobile
- [ ] Loading states show skeleton

## Critical Files for Implementation

- `/apps/web/src/app/(dashboard)/dashboard/analytics/page.tsx` - Main dashboard page
- `/apps/web/src/lib/api/routes/analytics.ts` - New API route
- `/apps/web/src/lib/api/hooks/use-analytics.ts` - React Query hook
- `/apps/web/src/components/charts/chart-container.tsx` - Reusable chart wrapper
- `/apps/web/src/config/index.ts` - AI_MODELS with pricing for cost calculation
- `/apps/web/src/db/schema/usage.ts` - Usage table schema
