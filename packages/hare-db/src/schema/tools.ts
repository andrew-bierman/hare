import { createId } from '@paralleldrive/cuid2'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { agents } from './agents'
import { users } from './auth'
import { workspaces } from './workspaces'

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
			'search',
			// Utility
			'datetime',
			'json',
			'text',
			'math',
			'uuid',
			'hash',
			'base64',
			'url',
			'delay',
			// Integrations
			'zapier',
			'webhook',
			'slack',
			'discord',
			'email',
			'teams',
			'twilio_sms',
			'make',
			'n8n',
			// AI
			'sentiment',
			'summarize',
			'translate',
			'image_generate',
			'classify',
			'ner',
			'embedding',
			'question_answer',
			// Data
			'rss',
			'scrape',
			'regex',
			'crypto',
			'json_schema',
			'csv',
			'template',
			// Sandbox
			'code_execute',
			'code_validate',
			'sandbox_file',
			// Validation
			'validate_email',
			'validate_phone',
			'validate_url',
			'validate_credit_card',
			'validate_ip',
			'validate_json',
			// Transform
			'markdown',
			'diff',
			'qrcode',
			'compression',
			'color',
			// Custom code
			'custom',
		],
	}).notNull(),
	inputSchema: text('inputSchema', { mode: 'json' }).$type<{
		type: 'object'
		properties?: Record<
			string,
			{
				type: 'string' | 'number' | 'boolean' | 'array' | 'object'
				description?: string
				default?: unknown
				enum?: string[]
				required?: boolean
			}
		>
		required?: string[]
	}>(),
	config: text('config', { mode: 'json' }).$type<{
		// HTTP/Webhook config
		url?: string
		method?: string
		headers?: Record<string, string>
		body?: string
		bodyType?: 'json' | 'form' | 'text'
		responseMapping?: {
			path?: string
			transform?: string
		}
		timeout?: number
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
