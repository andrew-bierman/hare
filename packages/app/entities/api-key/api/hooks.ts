'use client'

/**
 * API Key Entity Hooks
 *
 * Re-exports API key hooks from the shared oRPC hooks.
 * Types are fully inferred from the server.
 */

export {
	useApiKeysQuery,
	useApiKeyQuery,
	useCreateApiKeyMutation,
	useUpdateApiKeyMutation,
	useDeleteApiKeyMutation,
} from '../../../shared/api/hooks'

// Re-export types from @hare/types for convenience
export type { ApiKey, ApiKeyWithSecret, CreateApiKeyInput, UpdateApiKeyInput } from '@hare/types'
