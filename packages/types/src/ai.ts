/**
 * AI SDK Type Re-exports
 *
 * Re-exports commonly used types from the Vercel AI SDK
 * to provide a single source of truth for AI-related types
 * across the monorepo.
 */

export type {
	// Message types
	ModelMessage,
	SystemModelMessage,
	UserModelMessage,
	AssistantModelMessage,
	ToolModelMessage,
	// Other useful types
	LanguageModel,
	LanguageModelUsage,
} from 'ai'
