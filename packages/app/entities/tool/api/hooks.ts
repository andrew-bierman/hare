'use client'

/**
 * Tool Entity Hooks
 *
 * Re-exports tool hooks from the shared oRPC hooks.
 * Types are fully inferred from the server.
 */

export {
	useToolsQuery,
	useToolQuery,
	useCreateToolMutation,
	useUpdateToolMutation,
	useDeleteToolMutation,
	useTestToolMutation,
	useTestExistingToolMutation,
} from '../../../shared/api/hooks'

// Re-export types from @hare/types for convenience
export type { Tool, CreateToolInput, ToolType } from '@hare/types'

// Keep tool types constant for backwards compatibility
export const TOOL_TYPES = ['http', 'sql', 'kv', 'r2', 'custom'] as const
