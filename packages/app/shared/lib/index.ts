/**
 * Shared Library
 *
 * Central export point for all shared utilities.
 * Following Feature-Sliced Design, this is the public API for the lib segment.
 */

// Jotai Atoms
export {
	onboardingDismissedAtom,
	tourActiveAtom,
	tourCompletedAtom,
	tourCurrentStepAtom,
} from './atoms'
export { exportToCSV, exportToJSON } from './export'
// Hooks
export { useDebouncedCallback, useDebouncedValue } from './hooks'
export { generateId, generatePrefixedId } from './id'
// Utilities
export { generateUniqueSlug, nameToSlug } from './slug'
// TanStack DB provider and collection hooks (exported separately from query hooks)
export {
	type AgentRow,
	type ScheduleRow,
	TanStackDBProvider,
	type ToolRow,
	useAgentCollection,
	useScheduleCollection,
	useTanStackDB,
	useToolCollection,
	useWorkspaceCollection,
	type WorkspaceRow,
} from './tanstack/db'

// TanStack utilities (form, table, virtual only - db hooks are in api/hooks)
export * from './tanstack/form'
export type { ServerFnInput } from './tanstack/server-functions'
export * from './tanstack/table'
export * from './tanstack/virtual'
export { type UseTourOptions, type UseTourReturn, useTour } from './use-tour'
