/**
 * Custom Tool Executor Service
 *
 * Provides safe execution of custom HTTP tools with:
 * - Template variable substitution
 * - Request timeout handling
 * - Response mapping
 * - Error handling
 */
import { isError, isRecord } from '@hare/checks'
import { z } from 'zod'

/**
 * HTTP tool configuration schema.
 */
export const HttpToolConfigSchema = z.object({
	url: z.string().url(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
	headers: z.record(z.string(), z.string()).optional(),
	body: z.string().optional(),
	bodyType: z.enum(['json', 'form', 'text']).default('json'),
	responseMapping: z
		.object({
			path: z.string().optional(),
			transform: z.string().optional(),
		})
		.optional(),
	timeout: z.number().min(1000).max(30000).default(10000),
})

export type HttpToolConfig = z.infer<typeof HttpToolConfigSchema>

/**
 * Input schema property definition.
 */
export const InputSchemaPropertySchema = z.object({
	type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
	description: z.string().optional(),
	default: z.unknown().optional(),
	enum: z.array(z.string()).optional(),
	required: z.boolean().optional(),
})

/**
 * Input schema definition.
 */
export const InputSchemaSchema = z.object({
	type: z.literal('object'),
	properties: z.record(z.string(), InputSchemaPropertySchema).optional(),
	required: z.array(z.string()).optional(),
})

export type InputSchema = z.infer<typeof InputSchemaSchema>

/**
 * Tool test request schema.
 */
export const ToolTestRequestSchema = z.object({
	config: HttpToolConfigSchema,
	inputSchema: InputSchemaSchema.optional(),
	testInput: z.record(z.string(), z.unknown()).optional(),
})

export type ToolTestRequest = z.infer<typeof ToolTestRequestSchema>

/**
 * Tool test result schema.
 */
export const ToolTestResultSchema = z.object({
	success: z.boolean(),
	status: z.number().optional(),
	statusText: z.string().optional(),
	headers: z.record(z.string(), z.string()).optional(),
	data: z.unknown().optional(),
	error: z.string().optional(),
	duration: z.number(),
	requestDetails: z.object({
		url: z.string(),
		method: z.string(),
		headers: z.record(z.string(), z.string()).optional(),
		body: z.string().optional(),
	}),
})

export type ToolTestResult = z.infer<typeof ToolTestResultSchema>

/**
 * Substitute template variables in a string.
 * Supports {{variable}} and {{variable.nested.path}} syntax.
 */
export function substituteVariables(options: {
	template: string
	variables: Record<string, unknown>
}): string {
	const { template, variables } = options
	return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
		const keys = path.trim().split('.')
		let value: unknown = variables
		for (const key of keys) {
			if (isRecord(value) && key in value) {
				value = (value as Record<string, unknown>)[key]
			} else {
				return match // Keep original if path not found
			}
		}
		if (value === null || value === undefined) {
			return ''
		}
		if (isRecord(value)) {
			return JSON.stringify(value)
		}
		return String(value)
	})
}

/**
 * Get value from object using dot notation path.
 */
export function getValueByPath(options: { obj: unknown; path: string }): unknown {
	const { obj, path } = options
	if (!path) return obj
	const keys = path.split('.')
	let value: unknown = obj
	for (const key of keys) {
		if (isRecord(value) && key in value) {
			value = (value as Record<string, unknown>)[key]
		} else {
			return undefined
		}
	}
	return value
}

/**
 * Validate input against the input schema.
 */
export function validateInput(options: { input: Record<string, unknown>; schema: InputSchema }): {
	valid: boolean
	errors: string[]
} {
	const { input, schema } = options
	const errors: string[] = []

	// Check required fields
	if (schema.required) {
		for (const field of schema.required) {
			if (!(field in input) || input[field] === undefined || input[field] === null) {
				errors.push(`Missing required field: ${field}`)
			}
		}
	}

	// Check field types
	if (schema.properties) {
		for (const [field, prop] of Object.entries(schema.properties)) {
			const value = input[field]
			if (value === undefined || value === null) {
				if (prop.required) {
					errors.push(`Missing required field: ${field}`)
				}
				continue
			}

			// Type validation
			switch (prop.type) {
				case 'string':
					if (typeof value !== 'string') {
						errors.push(`Field ${field} must be a string`)
					}
					break
				case 'number':
					if (typeof value !== 'number') {
						errors.push(`Field ${field} must be a number`)
					}
					break
				case 'boolean':
					if (typeof value !== 'boolean') {
						errors.push(`Field ${field} must be a boolean`)
					}
					break
				case 'array':
					if (!Array.isArray(value)) {
						errors.push(`Field ${field} must be an array`)
					}
					break
				case 'object':
					if (typeof value !== 'object' || Array.isArray(value)) {
						errors.push(`Field ${field} must be an object`)
					}
					break
			}

			// Enum validation
			if (prop.enum && !prop.enum.includes(String(value))) {
				errors.push(`Field ${field} must be one of: ${prop.enum.join(', ')}`)
			}
		}
	}

	return { valid: errors.length === 0, errors }
}

/**
 * Build the request URL with variable substitution.
 */
function buildRequestUrl(options: {
	config: HttpToolConfig
	variables: Record<string, unknown>
}): string {
	const { config, variables } = options
	return substituteVariables({ template: config.url, variables })
}

/**
 * Build request headers with variable substitution.
 */
function buildRequestHeaders(options: {
	config: HttpToolConfig
	variables: Record<string, unknown>
}): Record<string, string> {
	const { config, variables } = options
	const headers: Record<string, string> = {}

	if (config.headers) {
		for (const [key, value] of Object.entries(config.headers)) {
			headers[key] = substituteVariables({ template: value, variables })
		}
	}

	// Set default Content-Type based on body type
	if (config.body && !headers['Content-Type']) {
		switch (config.bodyType) {
			case 'json':
				headers['Content-Type'] = 'application/json'
				break
			case 'form':
				headers['Content-Type'] = 'application/x-www-form-urlencoded'
				break
			case 'text':
				headers['Content-Type'] = 'text/plain'
				break
		}
	}

	return headers
}

/**
 * Build request body with variable substitution.
 */
function buildRequestBody(options: {
	config: HttpToolConfig
	variables: Record<string, unknown>
}): string | undefined {
	const { config, variables } = options
	if (!config.body) return undefined

	const substituted = substituteVariables({ template: config.body, variables })

	// For form body type, try to parse JSON and convert to URL encoded
	if (config.bodyType === 'form') {
		try {
			const parsed = JSON.parse(substituted)
			if (isRecord(parsed)) {
				return new URLSearchParams(parsed as Record<string, string>).toString()
			}
		} catch {
			// If not JSON, return as-is
		}
	}

	return substituted
}

/**
 * Execute an HTTP tool with the given configuration and input.
 */
export async function executeHttpTool(options: {
	config: HttpToolConfig
	input: Record<string, unknown>
	inputSchema?: InputSchema
}): Promise<ToolTestResult> {
	const { config, input, inputSchema } = options
	const startTime = Date.now()

	// Validate input if schema provided
	if (inputSchema) {
		const validation = validateInput({ input, schema: inputSchema })
		if (!validation.valid) {
			return {
				success: false,
				error: `Input validation failed: ${validation.errors.join(', ')}`,
				duration: Date.now() - startTime,
				requestDetails: {
					url: config.url,
					method: config.method,
				},
			}
		}
	}

	// Build request
	const url = buildRequestUrl({ config, variables: input })
	const headers = buildRequestHeaders({ config, variables: input })
	const body = buildRequestBody({ config, variables: input })

	const requestDetails = {
		url,
		method: config.method,
		headers: Object.keys(headers).length > 0 ? headers : undefined,
		body,
	}

	try {
		// Create abort controller for timeout
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), config.timeout)

		const response = await fetch(url, {
			method: config.method,
			headers,
			body: config.method !== 'GET' ? body : undefined,
			signal: controller.signal,
		})

		clearTimeout(timeoutId)

		// Extract response headers
		const responseHeaders: Record<string, string> = {}
		response.headers.forEach((value, key) => {
			responseHeaders[key] = value
		})

		// Parse response body
		let data: unknown
		const contentType = response.headers.get('content-type') || ''

		if (contentType.includes('application/json')) {
			data = await response.json()
		} else if (contentType.includes('text/')) {
			data = await response.text()
		} else {
			// For binary or unknown content, return info about it
			const blob = await response.blob()
			data = {
				type: blob.type,
				size: blob.size,
				message: 'Binary content - not displayed',
			}
		}

		// Apply response mapping if configured
		if (config.responseMapping?.path && response.ok) {
			data = getValueByPath({ obj: data, path: config.responseMapping.path })
		}

		return {
			success: response.ok,
			status: response.status,
			statusText: response.statusText,
			headers: responseHeaders,
			data,
			error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
			duration: Date.now() - startTime,
			requestDetails,
		}
	} catch (error) {
		let errorMessage = 'Unknown error'

		if (isError(error)) {
			if (error.name === 'AbortError') {
				errorMessage = `Request timeout after ${config.timeout}ms`
			} else {
				errorMessage = error.message
			}
		}

		return {
			success: false,
			error: errorMessage,
			duration: Date.now() - startTime,
			requestDetails,
		}
	}
}

/**
 * Allowed URL patterns for custom HTTP tools.
 * This is a security measure to prevent abuse.
 */
const BLOCKED_HOSTS = [
	'localhost',
	'127.0.0.1',
	'0.0.0.0',
	'::1',
	'169.254.', // Link-local
	'10.', // Private
	'172.16.',
	'172.17.',
	'172.18.',
	'172.19.',
	'172.20.',
	'172.21.',
	'172.22.',
	'172.23.',
	'172.24.',
	'172.25.',
	'172.26.',
	'172.27.',
	'172.28.',
	'172.29.',
	'172.30.',
	'172.31.',
	'192.168.', // Private
]

/**
 * Check if a URL is safe to call.
 */
export function isUrlSafe(url: string): { safe: boolean; reason?: string } {
	try {
		const parsed = new URL(url)

		// Only allow http and https
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			return { safe: false, reason: 'Only HTTP and HTTPS protocols are allowed' }
		}

		// Check blocked hosts
		const hostname = parsed.hostname.toLowerCase()
		for (const blocked of BLOCKED_HOSTS) {
			if (hostname === blocked || hostname.startsWith(blocked)) {
				return { safe: false, reason: 'Internal/private network addresses are not allowed' }
			}
		}

		// Block metadata endpoints (cloud providers)
		if (
			hostname === 'metadata.google.internal' ||
			hostname === '169.254.169.254' ||
			hostname.endsWith('.internal')
		) {
			return { safe: false, reason: 'Cloud metadata endpoints are not allowed' }
		}

		return { safe: true }
	} catch {
		return { safe: false, reason: 'Invalid URL format' }
	}
}

/**
 * Test an HTTP tool configuration with mock input.
 */
export async function testHttpTool(request: ToolTestRequest): Promise<ToolTestResult> {
	const startTime = Date.now()

	// Validate URL safety
	const urlSafety = isUrlSafe(request.config.url)
	if (!urlSafety.safe) {
		return {
			success: false,
			error: urlSafety.reason,
			duration: Date.now() - startTime,
			requestDetails: {
				url: request.config.url,
				method: request.config.method,
			},
		}
	}

	// Execute with test input
	return executeHttpTool({
		config: request.config,
		input: request.testInput || {},
		inputSchema: request.inputSchema,
	})
}
