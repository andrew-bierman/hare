/**
 * Agent Entity
 *
 * Public API for the Agent entity following Feature-Sliced Design.
 */

// Hooks
export {
	useAgents,
	useAgent,
	useCreateAgent,
	useUpdateAgent,
	useDeleteAgent,
	useDeployAgent,
	useAgentPreview,
	useAgentPreviewQuery,
} from './api/hooks'

// Re-export Agent type from shared API
export type { Agent } from '../../shared/api'
