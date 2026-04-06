import { z } from 'zod'

/**
 * API key permissions schema.
 * Defines what actions the key can perform.
 */
export const ApiKeyPermissionsSchema = z
	.object({
		scopes: z
			.array(z.string())
			.optional()
			,
		agentIds: z
			.array(z.string())
			.optional()
			,
	})
	.nullable()
	

/**
 * Full API key schema for API responses.
 * Note: The actual key value is never returned except on creation.
 */
export const ApiKeySchema = z
	.object({
		id: z.string(),
		workspaceId: z.string(),
		name: z.string(),
		prefix: z.string(),
		permissions: ApiKeyPermissionsSchema,
		lastUsedAt: z.string().datetime().nullable(),
		expiresAt: z.string().datetime().nullable(),
		createdAt: z.string().datetime(),
	})
	

/**
 * API key response that includes the actual key value.
 * Only returned on key creation.
 */
export const ApiKeyWithSecretSchema = z
	.object({
		id: z.string(),
		workspaceId: z.string(),
		name: z.string(),
		prefix: z.string(),
		key: z.string(),
		permissions: ApiKeyPermissionsSchema,
		expiresAt: z.string().datetime().nullable(),
		createdAt: z.string().datetime(),
	})
	

/**
 * Schema for creating a new API key.
 */
export const CreateApiKeySchema = z
	.object({
		name: z.string().min(1).max(100),
		permissions: ApiKeyPermissionsSchema.optional(),
		expiresAt: z.string().datetime().optional(),
	})
	

/**
 * Schema for updating an API key.
 */
export const UpdateApiKeySchema = z
	.object({
		name: z.string().min(1).max(100).optional(),
		permissions: ApiKeyPermissionsSchema.optional(),
	})
	

/**
 * List of API keys response.
 */
export const ApiKeyListSchema = z
	.object({
		apiKeys: z.array(ApiKeySchema),
	})
	
