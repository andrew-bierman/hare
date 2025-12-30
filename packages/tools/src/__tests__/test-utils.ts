/**
 * Test utilities for type-safe tool result validation.
 *
 * These helpers use Zod to validate and type-narrow tool results,
 * avoiding the need for type casts while maintaining type safety.
 */
import { z } from 'zod'
import type { ToolResult, ToolContext } from '../types'
import type { Mock } from 'vitest'

/**
 * Create a typed result validator for tool outputs.
 * Returns the data property with proper typing if validation succeeds.
 */
export function expectResultData<T extends z.ZodTypeAny>(
	result: ToolResult<unknown>,
	schema: T,
): z.infer<T> {
	if (!result.success) {
		throw new Error(`Expected success but got error: ${result.error}`)
	}
	return schema.parse(result.data)
}

/**
 * Common result data schemas for utility tools
 */
export const ResultSchemas = {
	datetime: z.object({
		iso: z.string().optional(),
		unix: z.number().optional(),
		result: z.string().optional(),
		days: z.number().optional(),
		hours: z.number().optional(),
		minutes: z.number().optional(),
		seconds: z.number().optional(),
	}),

	json: z.object({
		result: z.unknown().optional(),
		value: z.unknown().optional(),
		keys: z.array(z.string()).optional(),
		length: z.number().optional(),
		type: z.string().optional(),
	}),

	text: z.object({
		result: z.union([z.string(), z.array(z.string())]).optional(),
		count: z.number().optional(),
	}),

	math: z.object({
		result: z.number().optional(),
	}),

	uuid: z.object({
		id: z.string().optional(),
		ids: z.array(z.string()).optional(),
	}),

	hash: z.object({
		hash: z.string().optional(),
		matches: z.boolean().optional(),
		hmac: z.string().optional(),
	}),

	base64: z.object({
		result: z.string().optional(),
	}),

	url: z.object({
		protocol: z.string().optional(),
		host: z.string().optional(),
		hostname: z.string().optional(),
		port: z.string().optional(),
		pathname: z.string().optional(),
		search: z.string().optional(),
		hash: z.string().optional(),
		url: z.string().optional(),
		encoded: z.string().optional(),
		decoded: z.string().optional(),
	}),

	delay: z.object({
		requested: z.number().optional(),
		actual: z.number().optional(),
		reason: z.string().optional(),
	}),

	webFetch: z.object({
		url: z.string().optional(),
		text: z.string().optional(),
		links: z.array(z.object({ href: z.string(), text: z.string().optional() })).optional(),
		meta: z.record(z.string(), z.string()).optional(),
		fetchedAt: z.string().optional(),
	}),

	regex: z.object({
		matches: z.union([z.boolean(), z.array(z.unknown())]).optional(),
		match: z.string().nullable().optional(),
		found: z.boolean().optional(),
		index: z.number().optional(),
		groups: z.record(z.string(), z.string()).optional(),
		result: z.string().optional(),
		parts: z.array(z.string()).optional(),
		pattern: z.string().optional(),
		flags: z.string().optional(),
	}),

	random: z.object({
		result: z.union([z.string(), z.number()]).optional(),
	}),

	html: z.object({
		extracted: z.union([z.string(), z.array(z.string())]).optional(),
	}),

	crypto: z.object({
		key: z.string().optional(),
		algorithm: z.string().optional(),
		keyLength: z.number().optional(),
		hex: z.string().optional(),
		base64: z.string().optional(),
		bytes: z.number().optional(),
		encrypted: z.string().optional(),
		decrypted: z.string().optional(),
		iv: z.string().optional(),
	}),

	csv: z.object({
		data: z.array(z.record(z.string(), z.unknown())).optional(),
		headers: z.array(z.string()).optional(),
		rowCount: z.number().optional(),
		csv: z.string().optional(),
	}),

	kv: z.object({
		value: z.unknown().optional(),
		key: z.string().optional(),
		keys: z.array(z.string()).optional(),
		deleted: z.boolean().optional(),
	}),

	// Recall memory tool outputs
	recallMemory: z.object({
		found: z.boolean().optional(),
		count: z.number().optional(),
		message: z.string().optional(),
		query: z.string().optional(),
		memories: z.array(z.unknown()).optional(),
	}),

	sandbox: z.object({
		stdout: z.string().optional(),
		stderr: z.string().optional(),
		result: z.unknown().optional(),
		exitCode: z.number().optional(),
	}),

	// Sandbox file tool outputs
	sandboxFile: z.object({
		path: z.string().optional(),
		content: z.string().optional(),
		written: z.boolean().optional(),
		listing: z.string().optional(),
	}),

	// Sandbox code validation outputs
	sandboxValidation: z.object({
		valid: z.boolean().optional(),
		issues: z.array(z.unknown()).optional(),
		length: z.number().optional(),
		lines: z.number().optional(),
	}),

	transform: z.object({
		result: z.unknown().optional(),
	}),

	// Markdown tool outputs
	markdown: z.object({
		html: z.string().optional(),
		text: z.string().optional(),
		headings: z.array(z.object({ level: z.number(), text: z.string() })).optional(),
		links: z.array(z.object({ href: z.string().optional(), text: z.string().optional(), isImage: z.boolean().optional() })).optional(),
		codeBlocks: z.array(z.object({ language: z.string().optional(), code: z.string().optional() })).optional(),
	}),

	// Compression tool outputs
	compression: z.object({
		compressed: z.string().optional(),
		decompressed: z.string().optional(),
		compressedSize: z.number().optional(),
		originalSize: z.number().optional(),
		ratio: z.number().optional(),
	}),

	// Color tool outputs
	color: z.object({
		output: z.unknown().optional(),
		complement: z.string().optional(),
		blended: z.string().optional(),
		palette: z.array(z.string()).optional(),
		contrastWithBlack: z.number().optional(),
		contrastWithWhite: z.number().optional(),
		recommendedTextColor: z.string().optional(),
		wcagAA: z.boolean().optional(),
		wcagAAA: z.boolean().optional(),
	}),

	// Scrape tool outputs
	scrape: z.object({
		url: z.string().optional(),
		text: z.string().optional(),
		links: z.array(z.object({ href: z.string(), text: z.string().optional() })).optional(),
		meta: z.record(z.string(), z.string()).optional(),
		fetchedAt: z.string().optional(),
	}),

	// Diff tool outputs
	diff: z.object({
		stats: z.object({
			additions: z.number().optional(),
			deletions: z.number().optional(),
			totalChanges: z.number().optional(),
		}).optional(),
		changes: z.array(z.unknown()).optional(),
		unifiedDiff: z.string().optional(),
	}),

	// QR Code tool outputs
	qrcode: z.object({
		svg: z.string().optional(),
		dataUrl: z.string().optional(),
		data: z.string().optional(),
	}),

	// Validation tool outputs
	validation: z.object({
		valid: z.boolean().optional(),
		errors: z.array(z.unknown()).optional(),
		type: z.string().optional(),
		items: z.array(z.unknown()).optional(),
	}),

	// Template tool outputs
	template: z.object({
		result: z.string().optional(),
		missingVariables: z.array(z.string()).optional(),
	}),

	// Store memory tool outputs
	storeMemory: z.object({
		stored: z.boolean().optional(),
		memoryId: z.string().optional(),
		type: z.string().optional(),
		contentLength: z.number().optional(),
		message: z.string().optional(),
	}),
}

/**
 * Create a mock context for testing.
 */
export function createMockContext(): ToolContext {
	return {
		env: {} as ToolContext['env'],
		workspaceId: 'test-workspace',
		userId: 'test-user',
	}
}

/**
 * Create a properly typed fetch mock.
 * The mock is cast through unknown to satisfy TypeScript's fetch type.
 */
export function createFetchMock(impl: Mock): typeof globalThis.fetch {
	return impl as unknown as typeof globalThis.fetch
}
