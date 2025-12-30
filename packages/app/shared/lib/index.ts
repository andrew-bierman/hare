/**
 * Shared Library
 *
 * Central export point for all shared utilities.
 * Following Feature-Sliced Design, this is the public API for the lib segment.
 */

// Hooks
export { useDebouncedCallback, useDebouncedValue } from './hooks'

// Utilities
export { generateUniqueSlug, nameToSlug } from './slug'
export { exportToCSV, exportToJSON } from './export'

// TanStack utilities (form, table, virtual only - db hooks are in api/hooks)
export * from './tanstack/form'
export * from './tanstack/table'
export * from './tanstack/virtual'
export type { ServerFnInput } from './tanstack/server-functions'

// TanStack DB provider and collection hooks (exported separately from query hooks)
export {
	TanStackDBProvider,
	useTanStackDB,
	useWorkspaceCollection,
	useAgentCollection,
	useToolCollection,
	useScheduleCollection,
	type AgentRow,
	type ToolRow,
	type WorkspaceRow,
	type ScheduleRow,
} from './tanstack/db'
