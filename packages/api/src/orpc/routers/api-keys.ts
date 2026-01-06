/**
 * oRPC API Keys Router
 *
 * Handles API key management with full type safety.
 */

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { apiKeys } from '@hare/db/schema'
import { generateApiKey } from '../../middleware/api-key'
import { requireWrite, requireAdmin, notFound, serverError, type WorkspaceContext } from '../base'
import {
	ApiKeySchema,
	ApiKeyWithSecretSchema,
	CreateApiKeySchema,
	UpdateApiKeySchema,
	SuccessSchema,
	IdParamSchema,
} from '../../schemas'

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

async function findApiKey(id: string, workspaceId: string, db: WorkspaceContext['db']) {
	const [apiKey] = await db
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, workspaceId)))
	return apiKey || null
}

// =============================================================================
// Procedures
// =============================================================================

/**
 * List all API keys in workspace
 */
export const list = requireWrite
	.route({ method: 'GET', path: '/api-keys' })
	.output(z.object({ apiKeys: z.array(ApiKeySchema) }))
	.handler(async ({ context }) => {
		const { db, workspaceId } = context

		const results = await db.select().from(apiKeys).where(eq(apiKeys.workspaceId, workspaceId))

		return { apiKeys: results.map(serializeApiKey) }
	})

/**
 * Get single API key by ID
 */
export const get = requireWrite
	.route({ method: 'GET', path: '/api-keys/{id}' })
	.input(IdParamSchema)
	.output(ApiKeySchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const apiKey = await findApiKey(input.id, workspaceId, db)
		if (!apiKey) notFound('API key not found')

		return serializeApiKey(apiKey)
	})

/**
 * Create new API key
 * Returns the full key value - this is the only time it's available!
 */
export const create = requireAdmin
	.route({ method: 'POST', path: '/api-keys', successStatus: 201 })
	.input(CreateApiKeySchema)
	.output(ApiKeyWithSecretSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		const { key, hashedKey, prefix } = await generateApiKey()

		const [apiKey] = await db
			.insert(apiKeys)
			.values({
				workspaceId,
				name: input.name,
				key,
				hashedKey,
				prefix,
				permissions: input.permissions,
				expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
				createdBy: user.id,
			})
			.returning()

		if (!apiKey) serverError('Failed to create API key')

		return {
			id: apiKey.id,
			workspaceId: apiKey.workspaceId,
			name: apiKey.name,
			prefix: apiKey.prefix,
			permissions: apiKey.permissions as { scopes?: string[]; agentIds?: string[] } | null,
			expiresAt: apiKey.expiresAt?.toISOString() ?? null,
			createdAt: apiKey.createdAt.toISOString(),
			key, // Only returned on creation
		}
	})

/**
 * Update API key
 */
export const update = requireAdmin
	.route({ method: 'PATCH', path: '/api-keys/{id}' })
	.input(IdParamSchema.merge(UpdateApiKeySchema))
	.output(ApiKeySchema)
	.handler(async ({ input, context }) => {
		const { id, ...data } = input
		const { db, workspaceId } = context

		const existing = await findApiKey(id, workspaceId, db)
		if (!existing) notFound('API key not found')

		const updateData: Partial<typeof apiKeys.$inferInsert> = {
			...(data.name !== undefined && { name: data.name }),
			...(data.permissions !== undefined && { permissions: data.permissions }),
		}

		const [apiKey] = await db.update(apiKeys).set(updateData).where(eq(apiKeys.id, id)).returning()

		if (!apiKey) serverError('Failed to update API key')

		return serializeApiKey(apiKey)
	})

/**
 * Delete/revoke API key
 */
export const remove = requireAdmin
	.route({ method: 'DELETE', path: '/api-keys/{id}' })
	.input(IdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const result = await db
			.delete(apiKeys)
			.where(and(eq(apiKeys.id, input.id), eq(apiKeys.workspaceId, workspaceId)))
			.returning()

		if (result.length === 0) notFound('API key not found')

		return { success: true }
	})

// =============================================================================
// Router Export
// =============================================================================

export const apiKeysRouter = {
	list,
	get,
	create,
	update,
	delete: remove,
}
