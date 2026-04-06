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
// Live query hooks
export {
	useLiveActiveSchedules,
	useLiveAgent,
	useLiveAgentCount,
	// Agents
	useLiveAgents,
	useLiveAgentsByStatus,
	useLiveAgentsWithTool,
	useLiveCustomTools,
	useLiveDeployedAgentCount,
	useLiveDeployedAgents,
	useLiveDraftAgents,
	useLivePendingSchedules,
	// Schedules
	useLiveSchedules,
	useLiveSystemTools,
	useLiveTool,
	useLiveToolCount,
	// Tools
	useLiveTools,
	useLiveToolsByType,
	useLiveWorkspace,
	// Workspaces
	useLiveWorkspaces,
} from './hooks'
// Mutation helpers
export {
	useAgentMutations,
	useScheduleMutations,
	useToolMutations,
	useWorkspaceMutations,
} from './mutations'
// Provider and context hooks
export {
	TanStackDBProvider,
	useAgentCollection,
	useScheduleCollection,
	useTanStackDB,
	useToolCollection,
	useWorkspaceCollection,
} from './provider'
