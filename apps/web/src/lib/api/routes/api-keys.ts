import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { apiKeys } from 'web-app/db/schema'
import { getDb } from '../db'
import { commonResponses, requireAdminAccess } from '../helpers'
import { authMiddleware, generateApiKey, workspaceMiddleware } from '../middleware'
import {
	ApiKeyListSchema,
	ApiKeySchema,
	ApiKeyWithSecretSchema,
	CreateApiKeySchema,
	ErrorSchema,
	IdParamSchema,
	SuccessSchema,
	UpdateApiKeySchema,
} from '../schemas'
import type { WorkspaceEnv } from '../types'

// =============================================================================
// Serializers
// =============================================================================

/**
 * Serialize an API key for API response (without the secret).
 */
function serializeApiKey(key: typeof apiKeys.$inferSelect) {
	return {
		id: key.id,
		workspaceId: key.workspaceId,
		name: key.name,
		prefix: key.prefix,
		permissions: key.permissions,
		lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
		expiresAt: key.expiresAt?.toISOString() ?? null,
		createdAt: key.createdAt.toISOString(),
	}
}

// =============================================================================
// Route Definitions
// =============================================================================

const listApiKeysRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['API Keys'],
	summary: 'List all API keys',
	description: 'Get a list of all API keys for the workspace',
	request: {
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'List of API keys',
			content: {
				'application/json': {
					schema: ApiKeyListSchema,
				},
			},
		},
		...commonResponses,
	},
})

const createApiKeyRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['API Keys'],
	summary: 'Create a new API key',
	description:
		'Create a new API key for programmatic access. The full key is only shown once on creation.',
	request: {
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: CreateApiKeySchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'API key created successfully. The full key is only shown once.',
			content: {
				'application/json': {
					schema: ApiKeyWithSecretSchema,
				},
			},
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		500: {
			description: 'Failed to create API key',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const getApiKeyRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['API Keys'],
	summary: 'Get API key by ID',
	description: 'Retrieve a specific API key by its ID (without the secret)',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'API key details',
			content: {
				'application/json': {
					schema: ApiKeySchema,
				},
			},
		},
		404: {
			description: 'API key not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const updateApiKeyRoute = createRoute({
	method: 'patch',
	path: '/{id}',
	tags: ['API Keys'],
	summary: 'Update API key',
	description: 'Update an existing API key name or permissions',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: UpdateApiKeySchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'API key updated successfully',
			content: {
				'application/json': {
					schema: ApiKeySchema,
				},
			},
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'API key not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		500: {
			description: 'Failed to update API key',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const deleteApiKeyRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['API Keys'],
	summary: 'Revoke API key',
	description: 'Permanently revoke an API key',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'API key revoked successfully',
			content: {
				'application/json': {
					schema: SuccessSchema,
				},
			},
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'API key not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

// =============================================================================
// Route Handlers
// =============================================================================

const app = new OpenAPIHono<WorkspaceEnv>()

// Apply middleware
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

// List API keys
app.openapi(listApiKeysRoute, async (c) => {
	const db = await getDb(c)
	const workspace = c.get('workspace')

	const keys = await db.select().from(apiKeys).where(eq(apiKeys.workspaceId, workspace.id))

	return c.json({ apiKeys: keys.map(serializeApiKey) }, 200)
})

// Create API key
app.openapi(createApiKeyRoute, async (c) => {
	const data = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireAdminAccess(role)

	// Generate a new API key
	const { key, hashedKey, prefix } = await generateApiKey()

	// Parse expiration date if provided
	const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null

	const [apiKey] = await db
		.insert(apiKeys)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			key: key, // Store the raw key for now (will be removed in migration)
			hashedKey,
			prefix,
			permissions: data.permissions ?? null,
			expiresAt,
			createdBy: user.id,
		})
		.returning()

	if (!apiKey) {
		return c.json({ error: 'Failed to create API key' }, 500)
	}

	// Return the full key only on creation
	return c.json(
		{
			id: apiKey.id,
			workspaceId: apiKey.workspaceId,
			name: apiKey.name,
			prefix: apiKey.prefix,
			key, // Only returned on creation!
			permissions: apiKey.permissions,
			expiresAt: apiKey.expiresAt?.toISOString() ?? null,
			createdAt: apiKey.createdAt.toISOString(),
		},
		201,
	)
})

// Get API key
app.openapi(getApiKeyRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	const [key] = await db
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, workspace.id)))

	if (!key) {
		return c.json({ error: 'API key not found' }, 404)
	}

	return c.json(serializeApiKey(key), 200)
})

// Update API key
app.openapi(updateApiKeyRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireAdminAccess(role)

	// Check if key exists
	const [existing] = await db
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, workspace.id)))

	if (!existing) {
		return c.json({ error: 'API key not found' }, 404)
	}

	// Build update object
	const updateData: Partial<typeof apiKeys.$inferInsert> = {
		updatedAt: new Date(),
	}

	if (data.name !== undefined) {
		updateData.name = data.name
	}

	if (data.permissions !== undefined) {
		updateData.permissions = data.permissions
	}

	const [updated] = await db.update(apiKeys).set(updateData).where(eq(apiKeys.id, id)).returning()

	if (!updated) {
		return c.json({ error: 'Failed to update API key' }, 500)
	}

	return c.json(serializeApiKey(updated), 200)
})

// Delete/revoke API key
app.openapi(deleteApiKeyRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireAdminAccess(role)

	const result = await db
		.delete(apiKeys)
		.where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, workspace.id)))
		.returning()

	if (result.length === 0) {
		return c.json({ error: 'API key not found' }, 404)
	}

	return c.json({ success: true }, 200)
})

export default app
