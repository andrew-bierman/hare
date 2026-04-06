/**
 * MCP Authentication Middleware
 *
 * Unified auth for MCP routes that accepts EITHER:
 * 1. Session auth (cookie-based, from web UI)
 * 2. API key auth (Bearer token or X-API-Key header, from external clients)
 *
 * Returns 401 if neither is provided, which triggers the OAuth flow in
 * MCP clients like Claude Desktop.
 */

import { type AuthServerEnv, createAuth } from '@hare/auth/server'
import { HTTP_AUTH } from '@hare/config'
import { apiKeys, workspaces } from '@hare/db'
import type { AuthEnv, CloudflareEnv } from '@hare/types'
import { eq } from 'drizzle-orm'
import type { MiddlewareHandler } from 'hono'
import { getD1, getDb } from '../db'

/**
 * MCP auth environment - same shape as AuthEnv since we always resolve to a user.
 */
export type McpAuthEnv = AuthEnv

/**
 * Helper to get auth server env from Hono context
 */
function getAuthEnv(c: { env: CloudflareEnv }): AuthServerEnv {
	const env = c.env as CloudflareEnv & {
		BETTER_AUTH_SECRET?: string
		GOOGLE_CLIENT_ID?: string
		GOOGLE_CLIENT_SECRET?: string
		GITHUB_CLIENT_ID?: string
		GITHUB_CLIENT_SECRET?: string
	}

	if (!env.BETTER_AUTH_SECRET) {
		throw new Error('BETTER_AUTH_SECRET environment variable is required')
	}

	return {
		BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
		APP_URL: env.APP_URL ?? 'http://localhost:3000',
		GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
		GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
		GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
	}
}

/**
 * Extract API key from request headers.
 * Supports both Authorization: Bearer <key> and X-API-Key: <key> formats.
 */
function extractApiKey(c: {
	req: { header: (name: string) => string | undefined }
}): string | null {
	const authHeader = c.req.header('Authorization')
	if (authHeader?.startsWith(HTTP_AUTH.BEARER_PREFIX)) {
		return authHeader.slice(HTTP_AUTH.BEARER_PREFIX.length)
	}

	const apiKeyHeader = c.req.header('X-API-Key')
	if (apiKeyHeader) {
		return apiKeyHeader
	}

	return null
}

/**
 * Hash an API key for database lookup.
 */
async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder()
	const data = encoder.encode(key)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * MCP authentication middleware.
 *
 * Tries session auth first, then API key auth.
 * Returns 401 if neither succeeds (triggers OAuth in MCP clients).
 */
export const mcpAuthMiddleware: MiddlewareHandler<McpAuthEnv> = async (c, next) => {
	// Try session auth first (web UI users)
	// Config errors (e.g., missing BETTER_AUTH_SECRET) must propagate as 500,
	// so only catch the session lookup itself.
	const d1 = getD1(c)
	const authEnv = getAuthEnv(c)
	const auth = createAuth({ d1, env: authEnv })

	try {
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		})

		if (session?.user) {
			c.set('user', {
				id: session.user.id,
				email: session.user.email,
				name: session.user.name ?? null,
				image: session.user.image ?? null,
			})
			c.set('session', {
				id: session.session.id,
				expiresAt: session.session.expiresAt,
			})
			await next()
			return
		}
	} catch {
		// Session lookup failed (no cookie, invalid session, etc.) — try API key
	}

	// Try API key auth (external MCP clients)
	const rawKey = extractApiKey(c)
	if (rawKey) {
		try {
			const db = getDb(c)
			const hashedKey = await hashApiKey(rawKey)

			const [keyRecord] = await db.select().from(apiKeys).where(eq(apiKeys.hashedKey, hashedKey))

			if (keyRecord) {
				if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
					return c.json({ error: 'API key expired' }, 401)
				}

				const [workspace] = await db
					.select()
					.from(workspaces)
					.where(eq(workspaces.id, keyRecord.workspaceId))

				if (workspace) {
					// Validate that the requested workspace matches the API key's workspace.
					// Without this, a key for workspace A could access workspace B if the same owner.
					const requestedWorkspaceId =
						c.req.param('workspaceId') ||
						c.req.header('X-Workspace-Id') ||
						c.req.query('workspaceId')
					if (requestedWorkspaceId && requestedWorkspaceId !== keyRecord.workspaceId) {
						return c.json({ error: 'API key not authorized for this workspace' }, 403)
					}

					// Set user context from API key owner
					c.set('user', {
						id: workspace.ownerId,
						email: '',
						name: keyRecord.name,
						image: null,
					})

					// Update last used (non-blocking)
					const lastUsedUpdate = db
						.update(apiKeys)
						.set({ lastUsedAt: new Date() })
						.where(eq(apiKeys.id, keyRecord.id))
						.catch(() => {})

					c.executionCtx?.waitUntil(lastUsedUpdate)

					await next()
					return
				}
			}
		} catch {
			// API key auth failed
		}
	}

	// Neither auth method succeeded - return 401
	// This triggers OAuth flow in MCP clients (e.g., Claude Desktop)
	return c.json({ error: 'Authentication required' }, 401)
}
