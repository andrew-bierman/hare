/**
 * Tool Types
 *
 * Type definitions for Hare Tools used across the platform.
 * This is the single source of truth for tool type definitions.
 */

import { z } from 'zod'

/**
 * All available tool types.
 * This is the complete list of tool types supported by the platform.
 */
export const ToolTypeSchema = z.enum([
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
	// Custom
	'custom',
])

export type ToolType = z.infer<typeof ToolTypeSchema>

/**
 * Tool configuration (for database-stored tools).
 */
export const ToolConfigSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	type: ToolTypeSchema,
	inputSchema: z.record(z.string(), z.unknown()).nullable().optional(),
	config: z.record(z.string(), z.unknown()).nullable().optional(),
	code: z.string().nullable().optional(),
})

export type ToolConfig = z.infer<typeof ToolConfigSchema>
