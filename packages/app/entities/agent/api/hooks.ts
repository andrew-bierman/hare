'use client'

/**
 * Agent Entity Hooks
 *
 * Re-exports agent hooks from the shared oRPC hooks.
 * Types are fully inferred from the server.
 */

export {
	useAgentsQuery,
	useAgentQuery,
	useCreateAgentMutation,
	useUpdateAgentMutation,
	useDeleteAgentMutation,
	useDeployAgentMutation,
	useUndeployAgentMutation,
} from '../../../shared/api/hooks'

// Re-export types from @hare/types for convenience
export type { Agent, CreateAgentInput, UpdateAgentInput } from '@hare/types'
