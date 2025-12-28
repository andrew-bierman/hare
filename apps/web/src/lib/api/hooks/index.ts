/**
 * API Hooks
 *
 * Local hooks specific to the web app.
 * Import shared API hooks directly from '@hare/app/shared/api'.
 * Import config directly from '@hare/config'.
 */

// Re-export everything from @hare/app's shared API hooks
export * from '@hare/app/shared/api'

// Re-export AI models from config for convenience
export { AI_MODELS, type AIModel, getModelById, getModelName } from '@hare/config'
