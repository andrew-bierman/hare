/**
 * Centralized application configuration
 * All UI content, feature flags, and settings should be defined here
 */

import { serverEnv } from './env'

// =============================================================================
// App Metadata & Branding
// =============================================================================

export const APP_CONFIG = {
	name: 'Hare',
	tagline: 'Build AI Agents in Minutes',
	description:
		'The fastest way to create, deploy, and manage AI agents. Built on Cloudflare Workers for instant global deployment.',
	version: '0.1.0',
	stage: 'beta' as const,
	repository: 'https://github.com/andrew-bierman/hare',
	docs: '/docs',

	// Rabbit/Hare themed branding
	branding: {
		icon: 'Rabbit',
		tagline: 'Fast as a hare',
		mottos: ['Hop into production', 'Quick as a bunny', 'Built for speed - just like a hare'],
	},
} as const

// =============================================================================
// Feature Flags
// =============================================================================

export const FEATURES = {
	/** Enable developer mode UI helpers */
	devMode: serverEnv.NODE_ENV === 'development',
	/** Show beta badge in UI */
	showBetaBadge: true,
	/** Enable workspace switching */
	workspaces: true,
	/** Enable usage analytics */
	analytics: true,
	/** Enable custom tools */
	customTools: true,
	/** Enable AI chat features (feature flag for beta) */
	aiChat: serverEnv.FEATURE_AI_CHAT,
	/** Restrict AI chat to specific users (beta mode) */
	aiChatBetaMode: serverEnv.FEATURE_AI_CHAT_BETA_MODE,
	/** Enable rate limiting */
	rateLimiting: true,
} as const

// =============================================================================
// Beta Access
// =============================================================================

export const BETA_ACCESS = {
	/** Enable beta access restrictions */
	enabled: FEATURES.aiChatBetaMode,
	/** Allowed user emails (comma-separated) */
	allowedEmails: serverEnv.FEATURE_AI_CHAT_ALLOWED_EMAILS,
} as const

// =============================================================================
// Type Exports
// =============================================================================

export type AppConfig = typeof APP_CONFIG
export type Features = typeof FEATURES
export type BetaAccess = typeof BETA_ACCESS
