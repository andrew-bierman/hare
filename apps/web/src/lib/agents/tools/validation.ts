import { z } from 'zod'
import {
	parsePhoneNumberFromString,
	isValidPhoneNumber,
	type CountryCode,
} from 'libphonenumber-js'
import validator from 'validator'
import { createTool, success, type ToolContext } from './types'

/**
 * Email Validation Tool - Uses validator.js for robust email validation
 */
export const validateEmailTool = createTool({
	id: 'validate_email',
	description: 'Validate email addresses. Checks format and suggests corrections for common typos.',
	inputSchema: z.object({
		email: z.string().describe('Email address to validate'),
		suggestCorrection: z
			.boolean()
			.optional()
			.default(true)
			.describe('Suggest corrections for common typos'),
	}),
	execute: async (params, _context) => {
		const { email, suggestCorrection } = params

		const errors: string[] = []

		// Use validator.js for email validation
		const isValid = validator.isEmail(email, {
			allow_utf8_local_part: true,
			require_tld: true,
			allow_ip_domain: false,
		})

		if (!isValid) {
			errors.push('Invalid email format')
		}

		// Extract parts for additional info
		const atIndex = email.lastIndexOf('@')
		const localPart = atIndex > 0 ? email.substring(0, atIndex) : undefined
		const domain = atIndex > 0 ? email.substring(atIndex + 1).toLowerCase() : undefined

		// Check for common domain typos
		let suggestion: string | undefined
		if (suggestCorrection && domain) {
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
			if (domainCorrections[domain]) {
				suggestion = `${localPart}@${domainCorrections[domain]}`
			}
		}

		return success({
			valid: isValid && errors.length === 0,
			email,
			errors,
			suggestion,
			domain,
			localPart,
		})
	},
})

/**
 * Phone Number Validation Tool - Uses libphonenumber-js for 200+ country support
 */
export const validatePhoneTool = createTool({
	id: 'validate_phone',
	description:
		'Validate and format phone numbers. Supports 200+ countries with proper international formatting.',
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
	execute: async (params, _context) => {
		const { phone, country, format } = params

		const errors: string[] = []
		let formatted: string | undefined
		let detectedCountry: string | undefined
		let phoneType: string | undefined

		// Parse phone number using libphonenumber-js
		const phoneNumber = parsePhoneNumberFromString(phone, country.toUpperCase() as CountryCode)

		if (!phoneNumber) {
			errors.push('Could not parse phone number')
			return success({
				valid: false,
				original: phone,
				errors,
			})
		}

		const isValid = phoneNumber.isValid()
		if (!isValid) {
			errors.push('Invalid phone number for the specified country')
		}

		// Format based on requested format
		switch (format) {
			case 'e164':
				formatted = phoneNumber.format('E.164')
				break
			case 'national':
				formatted = phoneNumber.formatNational()
				break
			case 'international':
				formatted = phoneNumber.formatInternational()
				break
		}

		detectedCountry = phoneNumber.country
		phoneType = phoneNumber.getType()

		return success({
			valid: isValid,
			original: phone,
			formatted,
			country: detectedCountry,
			countryCallingCode: phoneNumber.countryCallingCode,
			nationalNumber: phoneNumber.nationalNumber,
			type: phoneType,
			isPossible: phoneNumber.isPossible(),
			errors,
		})
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
		timeout: z.number().optional().default(5000).describe('Timeout for reachability check'),
	}),
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
 * Credit Card Validation Tool - Uses validator.js for Luhn check and card detection
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
	execute: async (params, _context) => {
		const { number, validateExpiry, expiryMonth, expiryYear } = params

		// Remove spaces and dashes
		const cleaned = number.replace(/[\s-]/g, '')
		const errors: string[] = []

		// Use validator.js for credit card validation (includes Luhn check)
		const isValid = validator.isCreditCard(cleaned)

		if (!isValid) {
			errors.push('Invalid credit card number')
		}

		// Detect card type using patterns
		let cardType: string | undefined
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
				cardType = type
				break
			}
		}

		// Validate expiry if requested
		let expiryValid: boolean | undefined
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
				expiryValid = false
				errors.push('Invalid expiry month')
			} else if (year < currentYear || (year === currentYear && expiryMonth < currentMonth)) {
				expiryValid = false
				errors.push('Card has expired')
			} else {
				expiryValid = true
			}
		}

		return success({
			valid: isValid && errors.length === 0,
			number: cleaned.replace(/\d(?=\d{4})/g, '*'), // Masked
			cardType,
			lastFour: cleaned.slice(-4),
			expiryValid,
			errors,
		})
	},
})

/**
 * IP Address Validation Tool - Uses validator.js for IP validation
 */
export const validateIpTool = createTool({
	id: 'validate_ip',
	description:
		'Validate IP addresses (IPv4 and IPv6). Detects type and checks for reserved ranges.',
	inputSchema: z.object({
		ip: z.string().describe('IP address to validate'),
		checkType: z.boolean().optional().default(true).describe('Detect IP type and range'),
	}),
	execute: async (params, _context) => {
		const { ip, checkType } = params

		const errors: string[] = []

		// Use validator.js to check IP version
		const isIPv4 = validator.isIP(ip, 4)
		const isIPv6 = validator.isIP(ip, 6)
		const isValid = isIPv4 || isIPv6

		if (!isValid) {
			errors.push('Invalid IP address format')
			return success({
				valid: false,
				ip,
				errors,
			})
		}

		const version: 4 | 6 = isIPv4 ? 4 : 6
		let type: string | undefined
		let isPrivate: boolean | undefined
		let isLoopback: boolean | undefined
		let isReserved: boolean | undefined

		if (checkType) {
			if (isIPv4) {
				const octets = ip.split('.').map(Number)
				const [a, b, c, d] = octets

				if (a === 127) {
					isLoopback = true
					type = 'loopback'
				} else if (
					a === 10 ||
					(a === 172 && b !== undefined && b >= 16 && b <= 31) ||
					(a === 192 && b === 168)
				) {
					isPrivate = true
					type = 'private'
				} else if (a === 169 && b === 254) {
					type = 'link-local'
					isReserved = true
				} else if (a !== undefined && a >= 224 && a <= 239) {
					type = 'multicast'
					isReserved = true
				} else if (a === 255 && b === 255 && c === 255 && d === 255) {
					type = 'broadcast'
					isReserved = true
				} else {
					type = 'public'
					isPrivate = false
				}
			} else {
				// IPv6 type detection
				const lowerIp = ip.toLowerCase()
				if (ip === '::1') {
					isLoopback = true
					type = 'loopback'
				} else if (lowerIp.startsWith('fe80:')) {
					type = 'link-local'
				} else if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) {
					isPrivate = true
					type = 'private'
				} else if (lowerIp.startsWith('ff')) {
					type = 'multicast'
					isReserved = true
				} else {
					type = 'public'
				}
			}
		}

		return success({
			valid: true,
			ip,
			version,
			type,
			isPrivate,
			isLoopback,
			isReserved,
			errors,
		})
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
					const pos = parseInt(posStr, 10)
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
