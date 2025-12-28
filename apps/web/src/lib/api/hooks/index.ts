/**
 * API Hooks
 *
 * Re-export all hooks from @hare/app package.
 * This file exists for backward compatibility.
 */

// Re-export everything from @hare/app's shared API hooks
export * from '@hare/app/shared/api'

// Re-export AI models from config for convenience
export { AI_MODELS, type AIModel, getModelById, getModelName } from '@hare/config'
