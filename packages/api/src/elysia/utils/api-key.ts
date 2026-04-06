/**
 * API Key Utilities
 *
 * Pure utility functions for API key generation, hashing, and permission checks.
 */

import { config } from '@hare/config'
import type { ApiKeyInfo } from '@hare/types'

/**
 * Hash an API key using SHA-256 for storage.
 */
export async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder()
	const data = encoder.encode(key)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a new API key.
 * Returns the raw key (show once to user) and the hashed key (store in DB).
 */
export async function generateApiKey(): Promise<{
	key: string
	hashedKey: string
	prefix: string
}> {
	const randomBytes = new Uint8Array(config.security.apiKey.randomBytes)
	crypto.getRandomValues(randomBytes)

	const key =
		config.security.apiKey.prefix +
		btoa(String.fromCharCode(...randomBytes))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '')

	const hashedKey = await hashApiKey(key)
	const prefix = key.substring(0, config.security.apiKey.prefixDisplayLength)

	return { key, hashedKey, prefix }
}

/**
 * Check if API key has access to a specific agent.
 */
export function hasAgentAccess(options: { apiKey: ApiKeyInfo; agentId: string }): boolean {
	const { apiKey, agentId } = options
	if (!apiKey.permissions?.agentIds || apiKey.permissions.agentIds.length === 0) {
		return true
	}
	return apiKey.permissions.agentIds.includes(agentId)
}

/**
 * Check if API key has a specific scope.
 */
export function hasScope(options: { apiKey: ApiKeyInfo; scope: string }): boolean {
	const { apiKey, scope } = options
	if (!apiKey.permissions?.scopes || apiKey.permissions.scopes.length === 0) {
		return true
	}
	return apiKey.permissions.scopes.includes(scope)
}

/**
 * Extract API key from request headers.
 * Supports both Authorization: Bearer <key> and X-API-Key: <key> formats.
 */
export function extractApiKey(headers: Headers): string | null {
	const authHeader = headers.get('Authorization')
	if (authHeader?.startsWith('Bearer ')) {
		return authHeader.slice(7)
	}
	return headers.get('X-API-Key') ?? null
}
