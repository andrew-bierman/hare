import { eq } from 'drizzle-orm'
import type { MiddlewareHandler } from 'hono'
import { apiKeys, workspaces } from 'web-app/db/schema'
import { getDb } from '../db'
import type { ApiKeyEnv, ApiKeyInfo } from '@hare/types'

/**
 * Hash an API key for comparison.
 * Uses SubtleCrypto for edge compatibility.
 */
async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder()
	const data = encoder.encode(key)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Extract API key from request headers.
 * Supports both Authorization: Bearer <key> and X-API-Key: <key> formats.
 */
function extractApiKey(c: {
	req: { header: (name: string) => string | undefined }
}): string | null {
	// First, check Authorization header with Bearer token
	const authHeader = c.req.header('Authorization')
	if (authHeader?.startsWith('Bearer ')) {
		return authHeader.slice(7) // Remove 'Bearer ' prefix
	}

	// Fallback to X-API-Key header
	const apiKeyHeader = c.req.header('X-API-Key')
	if (apiKeyHeader) {
		return apiKeyHeader
	}

	return null
}

/**
 * API Key authentication middleware.
 * Validates Authorization: Bearer <key> or X-API-Key header against api_keys table.
 * Use for external API access (agent endpoints).
 */
export const apiKeyMiddleware: MiddlewareHandler<ApiKeyEnv> = async (c, next) => {
	const apiKey = extractApiKey(c)

	if (!apiKey) {
		return c.json({ error: 'API key required' }, 401)
	}

	const db = getDb(c)
	const hashedKey = await hashApiKey(apiKey)

	const [keyRecord] = await db.select().from(apiKeys).where(eq(apiKeys.hashedKey, hashedKey))

	if (!keyRecord) {
		return c.json({ error: 'Invalid API key' }, 401)
	}

	if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
		return c.json({ error: 'API key expired' }, 401)
	}

	const [workspace] = await db
		.select()
		.from(workspaces)
		.where(eq(workspaces.id, keyRecord.workspaceId))

	if (!workspace) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

	// Update last used timestamp (non-blocking)
	db.update(apiKeys)
		.set({ lastUsedAt: new Date() })
		.where(eq(apiKeys.id, keyRecord.id))
		.catch((error) => {
			console.error('Failed to update API key lastUsedAt:', error)
		})

	c.set('apiKey', {
		id: keyRecord.id,
		workspaceId: keyRecord.workspaceId,
		name: keyRecord.name,
		permissions: keyRecord.permissions,
	})

	c.set('workspace', {
		id: workspace.id,
		name: workspace.name,
		slug: workspace.slug,
		ownerId: workspace.ownerId,
	})

	await next()
}

/**
 * Check if API key has access to a specific agent.
 */
export function hasAgentAccess(apiKey: ApiKeyInfo, agentId: string): boolean {
	if (!apiKey.permissions?.agentIds || apiKey.permissions.agentIds.length === 0) {
		return true
	}
	return apiKey.permissions.agentIds.includes(agentId)
}

/**
 * Check if API key has a specific scope.
 */
export function hasScope(apiKey: ApiKeyInfo, scope: string): boolean {
	if (!apiKey.permissions?.scopes || apiKey.permissions.scopes.length === 0) {
		return true
	}
	return apiKey.permissions.scopes.includes(scope)
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
	const randomBytes = new Uint8Array(32)
	crypto.getRandomValues(randomBytes)

	const key =
		'hare_' +
		btoa(String.fromCharCode(...randomBytes))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '')

	const hashedKey = await hashApiKey(key)
	const prefix = key.substring(0, 12)

	return { key, hashedKey, prefix }
}
