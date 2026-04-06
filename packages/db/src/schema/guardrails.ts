import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { agents } from './agents'
import { workspaces } from './workspaces'

/**
 * Agent Guardrails - safety and content policies.
 * Configurable per-agent rules for input/output filtering,
 * topic restrictions, and PII protection.
 */

export const GUARDRAIL_TYPES = [
	'content_filter',
	'topic_restriction',
	'pii_protection',
	'prompt_injection',
	'output_validation',
	'word_filter',
] as const
export type GuardrailType = (typeof GUARDRAIL_TYPES)[number]

export const GUARDRAIL_ACTIONS = ['block', 'warn', 'redact', 'log'] as const
export type GuardrailAction = (typeof GUARDRAIL_ACTIONS)[number]

export const guardrails = sqliteTable(
	'guardrails',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		agentId: text('agentId')
			.notNull()
			.references(() => agents.id, { onDelete: 'cascade' }),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		type: text('type', { enum: GUARDRAIL_TYPES }).notNull().$type<GuardrailType>(),
		/** What to do when the guardrail triggers */
		action: text('action', { enum: GUARDRAIL_ACTIONS })
			.notNull()
			.default('block')
			.$type<GuardrailAction>(),
		enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
		/** Type-specific configuration */
		config: text('config', { mode: 'json' }).$type<{
			// content_filter
			categories?: string[]
			threshold?: number
			// topic_restriction
			allowedTopics?: string[]
			blockedTopics?: string[]
			// pii_protection
			piiTypes?: string[]
			redactionStyle?: 'mask' | 'remove' | 'placeholder'
			// prompt_injection
			detectionSensitivity?: 'low' | 'medium' | 'high'
			// output_validation
			maxLength?: number
			requiredFormat?: string
			bannedPhrases?: string[]
			// word_filter
			blockedWords?: string[]
			blockedPatterns?: string[]
		}>(),
		/** Custom message shown when guardrail triggers */
		message: text('message'),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('guardrails_agent_idx').on(table.agentId),
		index('guardrails_workspace_idx').on(table.workspaceId),
		index('guardrails_type_idx').on(table.type),
	],
)

/**
 * Guardrail violations log - tracks when guardrails trigger.
 * Used for analytics and tuning guardrail sensitivity.
 */
export const guardrailViolations = sqliteTable(
	'guardrail_violations',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		guardrailId: text('guardrailId')
			.notNull()
			.references(() => guardrails.id, { onDelete: 'cascade' }),
		agentId: text('agentId')
			.notNull()
			.references(() => agents.id, { onDelete: 'cascade' }),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		/** Whether the violation was on input or output */
		direction: text('direction', { enum: ['input', 'output'] }).notNull(),
		/** Action taken */
		actionTaken: text('actionTaken', { enum: GUARDRAIL_ACTIONS })
			.notNull()
			.$type<GuardrailAction>(),
		/** The content that triggered the violation (may be redacted) */
		triggerContent: text('triggerContent'),
		/** Details about what was detected */
		details: text('details', { mode: 'json' }).$type<{
			category?: string
			confidence?: number
			matchedPattern?: string
			piiType?: string
		}>(),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('violations_guardrail_idx').on(table.guardrailId),
		index('violations_agent_idx').on(table.agentId),
		index('violations_workspace_idx').on(table.workspaceId),
		index('violations_created_at_idx').on(table.createdAt),
	],
)
