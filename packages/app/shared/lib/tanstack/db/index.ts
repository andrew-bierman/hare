/**
 * TanStack DB Integration
 *
 * Provides reactive client-side data management with:
 * - Normalized collections for agents, tools, workspaces, schedules
 * - Live queries with sub-millisecond updates
 * - Optimistic mutations with automatic rollback
 *
 * @see https://tanstack.com/db/latest/docs/overview
 */

// Collections
export * from './collections'

// Provider and context hooks
export {
	TanStackDBProvider,
	useTanStackDB,
	useWorkspaceCollection,
	useAgentCollection,
	useToolCollection,
	useScheduleCollection,
} from './provider'

// Live query hooks
export {
	// Agents
	useLiveAgents,
	useLiveAgent,
	useLiveAgentsByStatus,
	useLiveDeployedAgents,
	useLiveDraftAgents,
	useLiveAgentsWithTool,
	useLiveAgentCount,
	useLiveDeployedAgentCount,
	// Tools
	useLiveTools,
	useLiveTool,
	useLiveToolsByType,
	useLiveSystemTools,
	useLiveCustomTools,
	useLiveToolCount,
	// Workspaces
	useLiveWorkspaces,
	useLiveWorkspace,
	// Schedules
	useLiveSchedules,
	useLiveActiveSchedules,
	useLivePendingSchedules,
} from './hooks'

// Mutation helpers
export {
	useAgentMutations,
	useToolMutations,
	useWorkspaceMutations,
	useScheduleMutations,
} from './mutations'
