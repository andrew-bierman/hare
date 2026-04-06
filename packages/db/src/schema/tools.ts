import { TOOL_TYPES, type ToolType } from '@hare/config'
import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { agents } from './agents'
import { users } from './auth'
import { workspaces } from './workspaces'

export const tools = sqliteTable(
	'tools',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		type: text('type', { enum: TOOL_TYPES }).notNull().$type<ToolType>(),
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
	},
	(table) => ({
		workspaceIdx: index('tools_workspace_idx').on(table.workspaceId),
		typeIdx: index('tools_type_idx').on(table.type),
	}),
)

export const agentTools = sqliteTable(
	'agent_tools',
	{
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
	},
	(table) => ({
		agentIdx: index('agent_tools_agent_idx').on(table.agentId),
		toolIdx: index('agent_tools_tool_idx').on(table.toolId),
		// Prevent duplicate tool assignments to same agent
		uniqueToolAssignment: unique('agent_tools_unique').on(table.agentId, table.toolId),
	}),
)
