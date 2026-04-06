/**
 * API Key Routes
 *
 * CRUD operations for API key management.
 */

import { config } from '@hare/config'
import type { Database } from '@hare/db'
import { apiKeys } from '@hare/db/schema'
import { and, eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import type { z } from 'zod'
import { type ApiKeySchema, CreateApiKeySchema, UpdateApiKeySchema } from '../../schemas'
import { logAudit } from '../audit'
import { type AuthUserContext, adminPlugin, writePlugin } from '../context'
import { generateApiKey } from '../utils/api-key'

// =============================================================================
// Helpers
// =============================================================================

function serializeApiKey(apiKey: typeof apiKeys.$inferSelect): z.infer<typeof ApiKeySchema> {
	return {
		id: apiKey.id,
		workspaceId: apiKey.workspaceId,
		name: apiKey.name,
		prefix: apiKey.prefix,
		permissions: apiKey.permissions as { scopes?: string[]; agentIds?: string[] } | null,
		lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
		expiresAt: apiKey.expiresAt?.toISOString() ?? null,
		createdAt: apiKey.createdAt.toISOString(),
	}
}

async function findApiKey(id: string, workspaceId: string, db: Database) {
	const [apiKey] = await db
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, workspaceId)))
	return apiKey || null
}

function auditCtx(ctx: {
	db: Database
	workspaceId: string
	user: AuthUserContext
	request: Request
}) {
	return {
		db: ctx.db,
		workspaceId: ctx.workspaceId,
		userId: ctx.user.id,
		headers: ctx.request.headers,
	}
}

// =============================================================================
// Routes
// =============================================================================

export const apiKeyRoutes = new Elysia({ prefix: '/api-keys', name: 'api-key-routes' })
	// --- Write-access routes (list, get) ---
	.use(writePlugin)

	// List API keys
	.get(
		'/',
		async ({ db, workspaceId }) => {
			const results = await db.select().from(apiKeys).where(eq(apiKeys.workspaceId, workspaceId))
			return { apiKeys: results.map(serializeApiKey) }
		},
		{ writeAccess: true },
	)

	// Get API key
	.get(
		'/:id',
		async ({ db, workspaceId, params }) => {
			const apiKey = await findApiKey(params.id, workspaceId, db)
			if (!apiKey) return status(404, { error: 'API key not found' })
			return serializeApiKey(apiKey)
		},
		{ writeAccess: true },
	)

	// --- Admin-access routes (create, update, delete) ---
	.use(adminPlugin)

	// Create API key
	.post(
		'/',
		async (ctx) => {
			const { db, workspaceId, user, body } = ctx
			const { key, hashedKey, prefix } = await generateApiKey()

			const [apiKey] = await db
				.insert(apiKeys)
				.values({
					workspaceId,
					name: body.name,
					hashedKey,
					prefix,
					permissions: body.permissions,
					expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
					createdBy: user.id,
				})
				.returning()

			if (!apiKey) throw new Error('Failed to create API key')

			await logAudit({
				...auditCtx(ctx),
				action: config.enums.auditAction.APIKEY_CREATE,
				resourceType: 'apikey',
				resourceId: apiKey.id,
				details: { name: apiKey.name, prefix: apiKey.prefix },
			})

			return {
				id: apiKey.id,
				workspaceId: apiKey.workspaceId,
				name: apiKey.name,
				prefix: apiKey.prefix,
				permissions: apiKey.permissions as { scopes?: string[]; agentIds?: string[] } | null,
				expiresAt: apiKey.expiresAt?.toISOString() ?? null,
				createdAt: apiKey.createdAt.toISOString(),
				key,
			}
		},
		{ adminAccess: true, body: CreateApiKeySchema },
	)

	// Update API key
	.patch(
		'/:id',
		async ({ db, workspaceId, params, body }) => {
			const existing = await findApiKey(params.id, workspaceId, db)
			if (!existing) return status(404, { error: 'API key not found' })

			const updateData: Partial<typeof apiKeys.$inferInsert> = {
				...(body.name !== undefined && { name: body.name }),
				...(body.permissions !== undefined && { permissions: body.permissions }),
			}

			const [apiKey] = await db
				.update(apiKeys)
				.set(updateData)
				.where(eq(apiKeys.id, params.id))
				.returning()

			if (!apiKey) throw new Error('Failed to update API key')

			return serializeApiKey(apiKey)
		},
		{ adminAccess: true, body: UpdateApiKeySchema },
	)

	// Delete/revoke API key
	.delete(
		'/:id',
		async (ctx) => {
			const { db, workspaceId, params } = ctx
			const result = await db
				.delete(apiKeys)
				.where(and(eq(apiKeys.id, params.id), eq(apiKeys.workspaceId, workspaceId)))
				.returning()

			if (result.length === 0) return status(404, { error: 'API key not found' })

			const deletedKey = result[0]
			await logAudit({
				...auditCtx(ctx),
				action: config.enums.auditAction.APIKEY_REVOKE,
				resourceType: 'apikey',
				resourceId: params.id,
				details: { name: deletedKey?.name, prefix: deletedKey?.prefix },
			})

			return { success: true }
		},
		{ adminAccess: true },
	)
