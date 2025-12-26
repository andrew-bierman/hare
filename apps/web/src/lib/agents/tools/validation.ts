import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from './types'

/**
 * Email Validation Tool
 */
export const validateEmailTool = createTool({
	id: 'validate_email',
	description: 'Validate email address format and optionally check for disposable email domains.',
	inputSchema: z.object({
		email: z.string().describe('Email address to validate'),
		checkDisposable: z
			.boolean()
			.optional()
			.default(false)
			.describe('Check if email is from a disposable domain'),
	}),
	execute: async (params, _context) => {
		try {
			const { email, checkDisposable } = params

			// RFC 5322 compliant email regex
			const emailRegex =
				/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

			const valid = emailRegex.test(email)
			const parts = email.split('@')
			const domain = parts[1]?.toLowerCase() || ''

			const disposableDomains = [
				'tempmail.com',
				'throwaway.email',
				'guerrillamail.com',
				'mailinator.com',
				'10minutemail.com',
				'temp-mail.org',
				'fakeinbox.com',
				'trashmail.com',
			]

			const isDisposable = checkDisposable && disposableDomains.some((d) => domain.includes(d))

			return success({
				valid: valid && (!checkDisposable || !isDisposable),
				email,
				domain,
				isDisposable: checkDisposable ? isDisposable : undefined,
				localPart: parts[0] || '',
			})
		} catch (error) {
			return failure(
				`Email validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Phone Validation Tool
 */
export const validatePhoneTool = createTool({
	id: 'validate_phone',
	description: 'Validate phone number format and extract country code.',
	inputSchema: z.object({
		phone: z.string().describe('Phone number to validate'),
		countryCode: z.string().optional().describe('Expected country code (e.g., "US", "GB")'),
	}),
	execute: async (params, _context) => {
		try {
			const { phone, countryCode } = params

			// Remove all non-digit characters except +
			const cleaned = phone.replace(/[^\d+]/g, '')

			// Basic international format validation
			const intlRegex = /^\+?[1-9]\d{6,14}$/
			const valid = intlRegex.test(cleaned)

			// Extract country calling code
			let callingCode = ''
			if (cleaned.startsWith('+')) {
				const codes = ['1', '44', '91', '86', '81', '49', '33', '39', '34', '7']
				for (const code of codes) {
					if (cleaned.slice(1).startsWith(code)) {
						callingCode = code
						break
					}
				}
			}

			// Country code to calling code mapping
			const countryCallingCodes: Record<string, string> = {
				US: '1',
				CA: '1',
				GB: '44',
				IN: '91',
				CN: '86',
				JP: '81',
				DE: '49',
				FR: '33',
				IT: '39',
				ES: '34',
				RU: '7',
			}

			const expectedCallingCode = countryCode
				? countryCallingCodes[countryCode.toUpperCase()]
				: undefined
			const matchesCountry = expectedCallingCode ? callingCode === expectedCallingCode : undefined

			return success({
				valid,
				phone,
				cleaned,
				callingCode: callingCode || undefined,
				matchesCountry,
				digitCount: cleaned.replace(/\D/g, '').length,
			})
		} catch (error) {
			return failure(
				`Phone validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * URL Validation Tool
 */
export const validateUrlTool = createTool({
	id: 'validate_url',
	description: 'Validate URL format and extract components.',
	inputSchema: z.object({
		url: z.string().describe('URL to validate'),
		requireHttps: z.boolean().optional().default(false).describe('Require HTTPS protocol'),
		allowedHosts: z.array(z.string()).optional().describe('List of allowed hostnames'),
	}),
	execute: async (params, _context) => {
		try {
			const { url, requireHttps, allowedHosts } = params

			let parsed: URL
			try {
				parsed = new URL(url)
			} catch {
				return success({ valid: false, url, error: 'Invalid URL format' })
			}

			const isHttps = parsed.protocol === 'https:'
			const isHttp = parsed.protocol === 'http:'

			if (requireHttps && !isHttps) {
				return success({ valid: false, url, error: 'HTTPS required' })
			}

			if (
				allowedHosts &&
				!allowedHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))
			) {
				return success({ valid: false, url, error: 'Host not allowed' })
			}

			return success({
				valid: isHttp || isHttps,
				url,
				protocol: parsed.protocol,
				hostname: parsed.hostname,
				port: parsed.port || undefined,
				pathname: parsed.pathname,
				search: parsed.search || undefined,
				hash: parsed.hash || undefined,
			})
		} catch (error) {
			return failure(
				`URL validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Credit Card Validation Tool
 */
export const validateCreditCardTool = createTool({
	id: 'validate_credit_card',
	description: 'Validate credit card number using Luhn algorithm and detect card type.',
	inputSchema: z.object({
		number: z.string().describe('Credit card number to validate'),
	}),
	execute: async (params, _context) => {
		try {
			const { number } = params

			// Remove spaces and dashes
			const cleaned = number.replace(/[\s-]/g, '')

			// Check if only digits
			if (!/^\d+$/.test(cleaned)) {
				return success({ valid: false, number: '****', error: 'Must contain only digits' })
			}

			// Luhn algorithm
			let sum = 0
			let isEven = false
			for (let i = cleaned.length - 1; i >= 0; i--) {
				let digit = parseInt(cleaned[i] || '0', 10)
				if (isEven) {
					digit *= 2
					if (digit > 9) digit -= 9
				}
				sum += digit
				isEven = !isEven
			}
			const luhnValid = sum % 10 === 0

			// Detect card type
			let cardType = 'Unknown'
			if (/^4/.test(cleaned)) cardType = 'Visa'
			else if (/^5[1-5]/.test(cleaned)) cardType = 'Mastercard'
			else if (/^3[47]/.test(cleaned)) cardType = 'American Express'
			else if (/^6(?:011|5)/.test(cleaned)) cardType = 'Discover'
			else if (/^(?:2131|1800|35)/.test(cleaned)) cardType = 'JCB'

			// Mask the number for security
			const masked = cleaned.slice(0, 4) + '*'.repeat(cleaned.length - 8) + cleaned.slice(-4)

			return success({
				valid: luhnValid && cleaned.length >= 13 && cleaned.length <= 19,
				masked,
				cardType,
				length: cleaned.length,
			})
		} catch (error) {
			return failure(
				`Credit card validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * IP Address Validation Tool
 */
export const validateIpTool = createTool({
	id: 'validate_ip',
	description: 'Validate IPv4 or IPv6 address format and determine type.',
	inputSchema: z.object({
		ip: z.string().describe('IP address to validate'),
	}),
	execute: async (params, _context) => {
		try {
			const { ip } = params

			// IPv4 validation
			const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
			const ipv4Match = ip.match(ipv4Regex)

			if (ipv4Match) {
				const octets = [ipv4Match[1], ipv4Match[2], ipv4Match[3], ipv4Match[4]].map(Number)
				const validOctets = octets.every((o) => o >= 0 && o <= 255)

				let ipType = 'Public'
				const first = octets[0] ?? 0
				const second = octets[1] ?? 0
				if (first === 10) ipType = 'Private (Class A)'
				else if (first === 172 && second >= 16 && second <= 31) ipType = 'Private (Class B)'
				else if (first === 192 && second === 168) ipType = 'Private (Class C)'
				else if (first === 127) ipType = 'Loopback'
				else if (first === 0) ipType = 'Reserved'
				else if (first >= 224 && first <= 239) ipType = 'Multicast'

				return success({
					valid: validOctets,
					ip,
					version: 'IPv4',
					type: ipType,
					octets,
				})
			}

			// IPv6 validation (simplified)
			const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
			const isValidIPv6 = ipv6Regex.test(ip) || ip === '::1' || ip === '::'

			if (isValidIPv6) {
				let ipType = 'Global Unicast'
				if (ip === '::1') ipType = 'Loopback'
				else if (ip.startsWith('fe80:')) ipType = 'Link-Local'
				else if (ip.startsWith('fc') || ip.startsWith('fd')) ipType = 'Unique Local'

				return success({
					valid: true,
					ip,
					version: 'IPv6',
					type: ipType,
				})
			}

			return success({ valid: false, ip, error: 'Invalid IP address format' })
		} catch (error) {
			return failure(
				`IP validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * JSON Validation Tool
 */
export const validateJsonTool = createTool({
	id: 'validate_json',
	description: 'Validate JSON syntax and optionally check structure.',
	inputSchema: z.object({
		json: z.string().describe('JSON string to validate'),
		requireObject: z.boolean().optional().default(false).describe('Require root to be an object'),
		requireArray: z.boolean().optional().default(false).describe('Require root to be an array'),
	}),
	execute: async (params, _context) => {
		try {
			const { json, requireObject, requireArray } = params

			let parsed: unknown
			try {
				parsed = JSON.parse(json)
			} catch (e) {
				return success({
					valid: false,
					error: e instanceof Error ? e.message : 'Invalid JSON syntax',
				})
			}

			const isObject = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
			const isArray = Array.isArray(parsed)

			if (requireObject && !isObject) {
				return success({ valid: false, error: 'Root must be an object' })
			}

			if (requireArray && !isArray) {
				return success({ valid: false, error: 'Root must be an array' })
			}

			const getType = (value: unknown): string => {
				if (value === null) return 'null'
				if (Array.isArray(value)) return 'array'
				return typeof value
			}

			return success({
				valid: true,
				type: getType(parsed),
				size: json.length,
				keyCount: isObject ? Object.keys(parsed as object).length : undefined,
				arrayLength: isArray ? (parsed as unknown[]).length : undefined,
			})
		} catch (error) {
			return failure(
				`JSON validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Get all validation tools.
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
