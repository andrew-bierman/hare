import { createId } from '@paralleldrive/cuid2'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { agents } from 'web-app/db/schema/agents'
import { users } from 'web-app/db/schema/auth'
import { workspaces } from 'web-app/db/schema/workspaces'

export const tools = sqliteTable('tools', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	workspaceId: text('workspaceId')
		.notNull()
		.references(() => workspaces.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	type: text('type', {
		enum: [
			// Cloudflare native
			'http',
			'sql',
			'kv',
			'r2',
			'vectorize',
			'search',
			// Integrations (user-configurable)
			'zapier',
			'webhook',
			'slack',
			'discord',
			'email',
			'teams',
			'twilio_sms',
			'make',
			'n8n',
			// Custom code
			'custom',
		],
	}).notNull(),
	config: text('config', { mode: 'json' }).$type<{
		// HTTP/Webhook config
		url?: string
		method?: string
		headers?: Record<string, string>
		body?: string
		// SQL config
		query?: string
		database?: string
		// Search config
		searchEngine?: string
		// Integration configs
		webhookUrl?: string
		apiKey?: string
		apiEndpoint?: string
		channel?: string
		from?: string
		// Custom code
		customCode?: string
	}>(),
	createdBy: text('createdBy')
		.notNull()
		.references(() => users.id),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})

export const agentTools = sqliteTable('agent_tools', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	agentId: text('agentId')
		.notNull()
		.references(() => agents.id, { onDelete: 'cascade' }),
	toolId: text('toolId')
		.notNull()
		.references(() => tools.id, { onDelete: 'cascade' }),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})
