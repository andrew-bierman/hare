/**
 * Shared Layer
 *
 * The shared layer contains reusable code that is used across the application.
 * This includes API types and utilities.
 *
 * Following Feature-Sliced Design, segments are organized by technical purpose:
 * - api: API types, schemas, and client utilities
 * - lib: Shared utilities and hooks
 *
 * Note: UI components should be imported directly from @hare/ui
 * Note: Configuration should be imported directly from @hare/config
 */

// API types and schemas (includes live hooks from api/hooks)
export * from './api'

// Library utilities (excluding TanStack DB hooks that conflict with api/hooks)
export {
	useDebouncedCallback,
	useDebouncedValue,
	generateUniqueSlug,
	nameToSlug,
	exportToCSV,
	exportToJSON,
	// TanStack DB provider (but not the hooks that conflict with api/hooks)
	TanStackDBProvider,
	useTanStackDB,
	useWorkspaceCollection,
	useAgentCollection,
	useToolCollection,
	useScheduleCollection,
	// Collection types
	type AgentRow,
	type ToolRow,
	type WorkspaceRow,
	type ScheduleRow,
} from './lib'
