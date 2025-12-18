import type { MiddlewareHandler } from 'hono'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { apiKeys, workspaces } from 'web-app/db/schema'

export interface ApiKeyInfo {
	id: string
	workspaceId: string
	name: string
	permissions: {
		scopes?: string[]
		agentIds?: string[]
	} | null
}

export interface ApiKeyVariables {
	apiKey: ApiKeyInfo
	workspace: {
		id: string
		name: string
		slug: string
		ownerId: string
	}
}

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
 * API Key authentication middleware.
 * Validates X-API-Key header against api_keys table.
 * Use for external API access (agent endpoints).
 */
export const apiKeyMiddleware: MiddlewareHandler<{ Variables: ApiKeyVariables }> = async (c, next) => {
	const apiKeyHeader = c.req.header('X-API-Key')

	if (!apiKeyHeader) {
		return c.json({ error: 'API key required' }, 401)
	}

	const db = await getDb(c)
	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	// Hash the provided key
	const hashedKey = await hashApiKey(apiKeyHeader)

	// Find matching API key
	const [keyRecord] = await db.select().from(apiKeys).where(eq(apiKeys.hashedKey, hashedKey))

	if (!keyRecord) {
		return c.json({ error: 'Invalid API key' }, 401)
	}

	// Check expiration
	if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
		return c.json({ error: 'API key expired' }, 401)
	}

	// Get workspace
	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, keyRecord.workspaceId))

	if (!workspace) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

	// Update last used timestamp (fire and forget)
	db.update(apiKeys)
		.set({ lastUsedAt: new Date() })
		.where(eq(apiKeys.id, keyRecord.id))
		.catch(() => {})

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
	// If no agentIds restriction, allow all
	if (!apiKey.permissions?.agentIds || apiKey.permissions.agentIds.length === 0) {
		return true
	}

	return apiKey.permissions.agentIds.includes(agentId)
}

/**
 * Check if API key has a specific scope.
 */
export function hasScope(apiKey: ApiKeyInfo, scope: string): boolean {
	// If no scopes restriction, allow all
	if (!apiKey.permissions?.scopes || apiKey.permissions.scopes.length === 0) {
		return true
	}

	return apiKey.permissions.scopes.includes(scope)
}

/**
 * Generate a new API key.
 * Returns the raw key (show once to user) and the hashed key (store in DB).
 */
export async function generateApiKey(): Promise<{ key: string; hashedKey: string; prefix: string }> {
	// Generate 32 random bytes
	const randomBytes = new Uint8Array(32)
	crypto.getRandomValues(randomBytes)

	// Convert to base64url
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
