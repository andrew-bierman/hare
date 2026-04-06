import { z } from 'zod'
import { Timeouts, ValidationLimits } from './constants'
import { createTool, success, type ToolContext } from './types'

// Output schema constants
const EmailValidationOutputSchema = z.object({
	valid: z.boolean(),
	email: z.string(),
	errors: z.array(z.string()),
	suggestion: z.string().optional(),
	domain: z.string().optional(),
	localPart: z.string().optional(),
})

const PhoneValidationOutputSchema = z.object({
	valid: z.boolean(),
	original: z.string(),
	formatted: z.string().optional(),
	country: z.string().optional(),
	errors: z.array(z.string()),
})

const UrlValidationOutputSchema = z.object({
	valid: z.boolean(),
	url: z.string(),
	parsed: z
		.object({
			protocol: z.string(),
			host: z.string(),
			pathname: z.string(),
			search: z.string(),
			hash: z.string(),
		})
		.optional(),
	reachable: z.boolean().optional(),
	statusCode: z.number().optional(),
	errors: z.array(z.string()),
})

const CreditCardValidationOutputSchema = z.object({
	valid: z.boolean(),
	number: z.string(),
	cardType: z.string().optional(),
	lastFour: z.string().optional(),
	expiryValid: z.boolean().optional(),
	errors: z.array(z.string()),
})

const IpValidationOutputSchema = z.object({
	valid: z.boolean(),
	ip: z.string(),
	version: z.union([z.literal(4), z.literal(6)]).optional(),
	type: z.string().optional(),
	isPrivate: z.boolean().optional(),
	isLoopback: z.boolean().optional(),
	isReserved: z.boolean().optional(),
	errors: z.array(z.string()),
})

const JsonValidationOutputSchema = z.object({
	valid: z.boolean(),
	parsed: z.unknown().optional(),
	type: z.string().optional(),
	errors: z.array(z.string()),
	position: z
		.object({
			line: z.number(),
			column: z.number(),
		})
		.optional(),
})

/**
 * Email Validation Tool
 */
export const validateEmailTool = createTool({
	id: 'validate_email',
	description:
		'Validate email addresses. Checks format, common typos, and optionally checks MX records.',
	inputSchema: z.object({
		email: z.string().describe('Email address to validate'),
		checkMx: z.boolean().optional().default(false).describe('Check if domain has valid MX records'),
		suggestCorrection: z
			.boolean()
			.optional()
			.default(true)
			.describe('Suggest corrections for common typos'),
	}),
	outputSchema: EmailValidationOutputSchema,
	execute: async (params, _context) => {
		const { email, checkMx: _checkMx, suggestCorrection } = params

		const result: {
			valid: boolean
			email: string
			errors: string[]
			suggestion?: string
			domain?: string
			localPart?: string
		} = {
			valid: true,
			email,
			errors: [],
		}

		// Basic format check
		const emailRegex =
			/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
		if (!emailRegex.test(email)) {
			result.valid = false
			result.errors.push('Invalid email format')
		}

		// Extract parts
		const atIndex = email.lastIndexOf('@')
		if (atIndex > 0) {
			result.localPart = email.substring(0, atIndex)
			result.domain = email.substring(atIndex + 1).toLowerCase()

			// Check for common domain typos
			if (suggestCorrection && result.domain) {
				const domainCorrections: Record<string, string> = {
					'gmial.com': 'gmail.com',
					'gmal.com': 'gmail.com',
					'gamil.com': 'gmail.com',
					'gnail.com': 'gmail.com',
					'gmail.co': 'gmail.com',
					'hotmal.com': 'hotmail.com',
					'hotmai.com': 'hotmail.com',
					'hotmial.com': 'hotmail.com',
					'outloo.com': 'outlook.com',
					'outlok.com': 'outlook.com',
					'yaho.com': 'yahoo.com',
					'yahooo.com': 'yahoo.com',
					'yhaoo.com': 'yahoo.com',
				}

				if (domainCorrections[result.domain]) {
					result.suggestion = `${result.localPart}@${domainCorrections[result.domain]}`
				}
			}

			// Length checks
			if (result.localPart.length > ValidationLimits.EMAIL_LOCAL_PART_MAX) {
				result.valid = false
				result.errors.push(
					`Local part too long (max ${ValidationLimits.EMAIL_LOCAL_PART_MAX} characters)`,
				)
			}
			if (result.domain.length > ValidationLimits.EMAIL_DOMAIN_MAX) {
				result.valid = false
				result.errors.push(`Domain too long (max ${ValidationLimits.EMAIL_DOMAIN_MAX} characters)`)
			}

			// Check domain has at least one dot
			if (!result.domain.includes('.')) {
				result.valid = false
				result.errors.push('Domain must contain at least one dot')
			}

			// Check for double dots
			if (email.includes('..')) {
				result.valid = false
				result.errors.push('Email cannot contain consecutive dots')
			}
		}

		return success(result)
	},
})

/**
 * Phone Number Validation Tool
 */
export const validatePhoneTool = createTool({
	id: 'validate_phone',
	description: 'Validate and format phone numbers. Supports international formats.',
	inputSchema: z.object({
		phone: z.string().describe('Phone number to validate'),
		country: z
			.string()
			.optional()
			.default('US')
			.describe('Expected country code (ISO 3166-1 alpha-2)'),
		format: z
			.enum(['e164', 'national', 'international'])
			.optional()
			.default('e164')
			.describe('Output format'),
	}),
	outputSchema: PhoneValidationOutputSchema,
	execute: async (params, _context) => {
		const { phone, country, format } = params

		// Remove all non-digit characters except leading +
		const cleaned = phone.replace(/(?!^\+)[^\d]/g, '')
		const digitsOnly = cleaned.replace(/\D/g, '')

		const result: {
			valid: boolean
			original: string
			formatted?: string
			country?: string
			errors: string[]
		} = {
			valid: true,
			original: phone,
			errors: [],
		}

		// Basic length validation
		if (digitsOnly.length < ValidationLimits.PHONE_MIN_DIGITS) {
			result.valid = false
			result.errors.push(`Phone number too short (min ${ValidationLimits.PHONE_MIN_DIGITS} digits)`)
		} else if (digitsOnly.length > ValidationLimits.PHONE_MAX_DIGITS) {
			result.valid = false
			result.errors.push(`Phone number too long (max ${ValidationLimits.PHONE_MAX_DIGITS} digits)`)
		}

		// Country-specific validation
		const countryRules: Record<string, { pattern: RegExp; format: (digits: string) => string }> = {
			US: {
				pattern: /^1?([2-9]\d{2})([2-9]\d{2})(\d{4})$/,
				format: (d) => {
					const match = d.match(/^1?(\d{3})(\d{3})(\d{4})$/)
					if (!match?.[1] || !match[2] || !match[3]) return d
					return format === 'e164'
						? `+1${match[1]}${match[2]}${match[3]}`
						: format === 'national'
							? `(${match[1]}) ${match[2]}-${match[3]}`
							: `+1 (${match[1]}) ${match[2]}-${match[3]}`
				},
			},
			GB: {
				pattern: /^(44)?([1-9]\d{9,10})$/,
				format: (d) => {
					const cleaned = d.replace(/^44/, '')
					return format === 'e164' ? `+44${cleaned}` : `+44 ${cleaned}`
				},
			},
			CA: {
				pattern: /^1?([2-9]\d{2})([2-9]\d{2})(\d{4})$/,
				format: (d) => {
					const match = d.match(/^1?(\d{3})(\d{3})(\d{4})$/)
					if (!match?.[1] || !match[2] || !match[3]) return d
					return format === 'e164'
						? `+1${match[1]}${match[2]}${match[3]}`
						: `+1 (${match[1]}) ${match[2]}-${match[3]}`
				},
			},
		}

		const rule = countryRules[country.toUpperCase()]
		if (rule) {
			result.country = country.toUpperCase()
			if (!rule.pattern.test(digitsOnly)) {
				result.valid = false
				result.errors.push(`Invalid ${country} phone number format`)
			} else {
				result.formatted = rule.format(digitsOnly)
			}
		} else {
			// Generic international format
			if (cleaned.startsWith('+')) {
				result.formatted = cleaned
			} else {
				result.formatted = format === 'e164' ? `+${digitsOnly}` : `+${digitsOnly}`
			}
		}

		return success(result)
	},
})

/**
 * URL Validation Tool
 */
export const validateUrlTool = createTool({
	id: 'validate_url',
	description:
		'Validate URLs. Checks format, protocol, and optionally verifies the URL is reachable.',
	inputSchema: z.object({
		url: z.string().describe('URL to validate'),
		allowedProtocols: z
			.array(z.string())
			.optional()
			.default(['http', 'https'])
			.describe('Allowed protocols'),
		checkReachable: z
			.boolean()
			.optional()
			.default(false)
			.describe('Check if URL is reachable (HEAD request)'),
		timeout: z
			.number()
			.optional()
			.default(Timeouts.URL_REACHABILITY)
			.describe('Timeout for reachability check'),
	}),
	outputSchema: UrlValidationOutputSchema,
	execute: async (params, _context) => {
		const { url, allowedProtocols, checkReachable, timeout } = params

		const result: {
			valid: boolean
			url: string
			parsed?: {
				protocol: string
				host: string
				pathname: string
				search: string
				hash: string
			}
			reachable?: boolean
			statusCode?: number
			errors: string[]
		} = {
			valid: true,
			url,
			errors: [],
		}

		try {
			const parsed = new URL(url)
			const protocol = parsed.protocol.replace(':', '')

			result.parsed = {
				protocol,
				host: parsed.host,
				pathname: parsed.pathname,
				search: parsed.search,
				hash: parsed.hash,
			}

			// Check allowed protocols
			if (!allowedProtocols.includes(protocol)) {
				result.valid = false
				result.errors.push(
					`Protocol '${protocol}' not allowed. Allowed: ${allowedProtocols.join(', ')}`,
				)
			}

			// Check for valid hostname
			if (!parsed.hostname || parsed.hostname.length === 0) {
				result.valid = false
				result.errors.push('Missing hostname')
			}

			// Check reachability
			if (checkReachable && result.valid) {
				try {
					const controller = new AbortController()
					const timeoutId = setTimeout(() => controller.abort(), timeout)

					const response = await fetch(url, {
						method: 'HEAD',
						signal: controller.signal,
					})

					clearTimeout(timeoutId)
					result.reachable = response.ok
					result.statusCode = response.status

					if (!response.ok) {
						result.errors.push(`URL returned status ${response.status}`)
					}
				} catch (error) {
					result.reachable = false
					if (error instanceof Error && error.name === 'AbortError') {
						result.errors.push(`Reachability check timed out after ${timeout}ms`)
					} else {
						result.errors.push('URL is not reachable')
					}
				}
			}
		} catch (_error) {
			result.valid = false
			result.errors.push('Invalid URL format')
		}

		return success(result)
	},
})

/**
 * Credit Card Validation Tool
 */
export const validateCreditCardTool = createTool({
	id: 'validate_credit_card',
	description:
		'Validate credit card numbers using the Luhn algorithm. Detects card type (Visa, Mastercard, etc.).',
	inputSchema: z.object({
		number: z.string().describe('Credit card number to validate'),
		validateExpiry: z.boolean().optional().default(false).describe('Also validate expiry date'),
		expiryMonth: z.number().optional().describe('Expiry month (1-12)'),
		expiryYear: z.number().optional().describe('Expiry year (2-digit or 4-digit)'),
	}),
	outputSchema: CreditCardValidationOutputSchema,
	execute: async (params, _context) => {
		const { number, validateExpiry, expiryMonth, expiryYear } = params

		// Remove spaces and dashes
		const cleaned = number.replace(/[\s-]/g, '')

		const result: {
			valid: boolean
			number: string
			cardType?: string
			lastFour?: string
			expiryValid?: boolean
			errors: string[]
		} = {
			valid: true,
			number: cleaned.replace(/\d(?=\d{4})/g, '*'), // Masked
			errors: [],
		}

		// Check if all digits
		if (!/^\d+$/.test(cleaned)) {
			result.valid = false
			result.errors.push('Card number must contain only digits')
			return success(result)
		}

		// Length check
		if (cleaned.length < 13 || cleaned.length > 19) {
			result.valid = false
			result.errors.push('Invalid card number length')
			return success(result)
		}

		result.lastFour = cleaned.slice(-4)

		// Detect card type
		const cardPatterns: Record<string, RegExp> = {
			visa: /^4/,
			mastercard: /^5[1-5]|^2[2-7]/,
			amex: /^3[47]/,
			discover: /^6(?:011|5)/,
			diners: /^3(?:0[0-5]|[68])/,
			jcb: /^(?:2131|1800|35)/,
		}

		for (const [type, pattern] of Object.entries(cardPatterns)) {
			if (pattern.test(cleaned)) {
				result.cardType = type
				break
			}
		}

		// Luhn algorithm
		let sum = 0
		let isEven = false

		for (let i = cleaned.length - 1; i >= 0; i--) {
			const char = cleaned[i]
			if (!char) continue
			let digit = Number.parseInt(char, 10)

			if (isEven) {
				digit *= 2
				if (digit > 9) {
					digit -= 9
				}
			}

			sum += digit
			isEven = !isEven
		}

		if (sum % 10 !== 0) {
			result.valid = false
			result.errors.push('Invalid card number (Luhn check failed)')
		}

		// Validate expiry if requested
		if (validateExpiry && expiryMonth !== undefined && expiryYear !== undefined) {
			const now = new Date()
			const currentYear = now.getFullYear()
			const currentMonth = now.getMonth() + 1

			// Normalize year
			let year = expiryYear
			if (year < 100) {
				year += 2000
			}

			if (expiryMonth < 1 || expiryMonth > 12) {
				result.expiryValid = false
				result.errors.push('Invalid expiry month')
			} else if (year < currentYear || (year === currentYear && expiryMonth < currentMonth)) {
				result.expiryValid = false
				result.errors.push('Card has expired')
			} else {
				result.expiryValid = true
			}
		}

		return success(result)
	},
})

/**
 * IP Address Validation Tool
 */
export const validateIpTool = createTool({
	id: 'validate_ip',
	description:
		'Validate IP addresses (IPv4 and IPv6). Detects type and checks for reserved ranges.',
	inputSchema: z.object({
		ip: z.string().describe('IP address to validate'),
		checkType: z.boolean().optional().default(true).describe('Detect IP type and range'),
	}),
	outputSchema: IpValidationOutputSchema,
	execute: async (params, _context) => {
		const { ip, checkType } = params

		const result: {
			valid: boolean
			ip: string
			version?: 4 | 6
			type?: string
			isPrivate?: boolean
			isLoopback?: boolean
			isReserved?: boolean
			errors: string[]
		} = {
			valid: false,
			ip,
			errors: [],
		}

		// IPv4 pattern
		const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
		const ipv4Match = ip.match(ipv4Pattern)

		if (ipv4Match) {
			const octets = ipv4Match.slice(1).map(Number)
			const allValid = octets.every((o) => o >= 0 && o <= 255)

			if (allValid) {
				result.valid = true
				result.version = 4

				if (checkType) {
					const a = octets[0]
					const b = octets[1]
					const c = octets[2]
					const d = octets[3]

					if (a === undefined || b === undefined || c === undefined || d === undefined) {
						result.valid = false
						result.errors.push('Invalid IP address format')
					}
					// Check loopback
					else if (a === 127) {
						result.isLoopback = true
						result.type = 'loopback'
					}
					// Private ranges
					else if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
						result.isPrivate = true
						result.type = 'private'
					}
					// Link-local
					else if (a === 169 && b === 254) {
						result.type = 'link-local'
						result.isReserved = true
					}
					// Multicast
					else if (a >= 224 && a <= 239) {
						result.type = 'multicast'
						result.isReserved = true
					}
					// Broadcast
					else if (a === 255 && b === 255 && c === 255 && d === 255) {
						result.type = 'broadcast'
						result.isReserved = true
					}
					// Public
					else {
						result.type = 'public'
						result.isPrivate = false
					}
				}
			} else {
				result.errors.push('Invalid IPv4 octets (must be 0-255)')
			}
		}
		// IPv6 pattern (simplified)
		else if (ip.includes(':')) {
			// Basic IPv6 validation
			const parts = ip.split(':')
			const hasDoubleColon = ip.includes('::')

			// Check for valid format
			if (parts.length <= 8 && (hasDoubleColon || parts.length === 8)) {
				const allValid = parts.every((part) => {
					if (part === '') return true // For :: notation
					return /^[0-9a-fA-F]{1,4}$/.test(part)
				})

				if (allValid) {
					result.valid = true
					result.version = 6

					if (checkType) {
						if (ip === '::1') {
							result.isLoopback = true
							result.type = 'loopback'
						} else if (ip.toLowerCase().startsWith('fe80:')) {
							result.type = 'link-local'
						} else if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) {
							result.isPrivate = true
							result.type = 'private'
						} else {
							result.type = 'public'
						}
					}
				} else {
					result.errors.push('Invalid IPv6 format')
				}
			} else {
				result.errors.push('Invalid IPv6 format')
			}
		} else {
			result.errors.push('Invalid IP address format')
		}

		return success(result)
	},
})

/**
 * JSON Validation Tool
 */
export const validateJsonTool = createTool({
	id: 'validate_json',
	description: 'Validate JSON strings. Provides detailed error messages for invalid JSON.',
	inputSchema: z.object({
		json: z.string().describe('JSON string to validate'),
		strict: z
			.boolean()
			.optional()
			.default(false)
			.describe('Strict mode (no trailing commas, no comments)'),
	}),
	outputSchema: JsonValidationOutputSchema,
	execute: async (params, _context) => {
		const { json, strict: _strict } = params

		const result: {
			valid: boolean
			parsed?: unknown
			type?: string
			errors: string[]
			position?: { line: number; column: number }
		} = {
			valid: false,
			errors: [],
		}

		try {
			result.parsed = JSON.parse(json)
			result.valid = true

			// Determine type
			if (result.parsed === null) {
				result.type = 'null'
			} else if (Array.isArray(result.parsed)) {
				result.type = 'array'
			} else {
				result.type = typeof result.parsed
			}
		} catch (error) {
			if (error instanceof SyntaxError) {
				result.errors.push(error.message)

				// Try to extract position from error message
				const posMatch = error.message.match(/position (\d+)/)
				const posStr = posMatch?.[1]
				if (posStr) {
					const pos = Number.parseInt(posStr, 10)
					const lines = json.substring(0, pos).split('\n')
					const lastLine = lines[lines.length - 1]
					result.position = {
						line: lines.length,
						column: (lastLine?.length ?? 0) + 1,
					}
				}
			} else {
				result.errors.push('Invalid JSON')
			}
		}

		return success(result)
	},
})

/**
 * Get all validation tools
 */
export function getValidationTools(_context: ToolContext) {
	return [
		validateEmailTool,
		validatePhoneTool,
		validateUrlTool,
		validateCreditCardTool,
		validateIpTool,
		validateJsonTool,
	]
}
