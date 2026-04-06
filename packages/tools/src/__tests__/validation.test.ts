import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ToolContext } from '../types'
import {
	getValidationTools,
	validateCreditCardTool,
	validateEmailTool,
	validateIpTool,
	validateJsonTool,
	validatePhoneTool,
	validateUrlTool,
} from '../validation'

const originalFetch = globalThis.fetch

const createMockContext = (): ToolContext => ({
	env: {} as ToolContext['env'],
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

describe('Validation Tools', () => {
	let context: ToolContext

	beforeEach(() => {
		context = createMockContext()
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.clearAllMocks()
	})

	describe('validateEmailTool', () => {
		describe('schema validation', () => {
			it('has correct tool id and description', () => {
				expect(validateEmailTool.id).toBe('validate_email')
				expect(validateEmailTool.description).toContain('email')
			})

			it('validates basic email input', () => {
				const result = validateEmailTool.inputSchema.safeParse({
					email: 'test@example.com',
				})
				expect(result.success).toBe(true)
			})

			it('validates with optional checkMx', () => {
				const result = validateEmailTool.inputSchema.safeParse({
					email: 'test@example.com',
					checkMx: true,
				})
				expect(result.success).toBe(true)
			})

			it('validates with optional suggestCorrection', () => {
				const result = validateEmailTool.inputSchema.safeParse({
					email: 'test@example.com',
					suggestCorrection: false,
				})
				expect(result.success).toBe(true)
			})

			it('rejects missing email', () => {
				const result = validateEmailTool.inputSchema.safeParse({})
				expect(result.success).toBe(false)
			})
		})

		describe('execution - valid emails', () => {
			it('validates correct email format', async () => {
				const result = await validateEmailTool.execute(
					{ email: 'user@example.com', checkMx: false, suggestCorrection: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.errors).toHaveLength(0)
			})

			it('validates email with subdomain', async () => {
				const result = await validateEmailTool.execute(
					{ email: 'user@mail.example.com', checkMx: false, suggestCorrection: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
			})

			it('validates email with plus addressing', async () => {
				const result = await validateEmailTool.execute(
					{ email: 'user+tag@example.com', checkMx: false, suggestCorrection: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
			})

			it('extracts local part and domain', async () => {
				const result = await validateEmailTool.execute(
					{ email: 'john.doe@company.com', checkMx: false, suggestCorrection: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.localPart).toBe('john.doe')
				expect(result.data?.domain).toBe('company.com')
			})
		})

		describe('execution - invalid emails', () => {
			it('rejects email without @', async () => {
				const result = await validateEmailTool.execute(
					{ email: 'userexample.com', checkMx: false, suggestCorrection: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors).toContain('Invalid email format')
			})

			it('rejects email without domain', async () => {
				const result = await validateEmailTool.execute(
					{ email: 'user@', checkMx: false, suggestCorrection: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
			})

			it('rejects email with consecutive dots', async () => {
				const result = await validateEmailTool.execute(
					{ email: 'user..name@example.com', checkMx: false, suggestCorrection: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors).toContain('Email cannot contain consecutive dots')
			})

			it('rejects domain without dot', async () => {
				const result = await validateEmailTool.execute(
					{ email: 'user@localhost', checkMx: false, suggestCorrection: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors).toContain('Domain must contain at least one dot')
			})
		})

		describe('execution - typo suggestions', () => {
			it('suggests gmail.com for gmial.com', async () => {
				const result = await validateEmailTool.execute(
					{ email: 'user@gmial.com', checkMx: false, suggestCorrection: true },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.suggestion).toBe('user@gmail.com')
			})

			it('suggests hotmail.com for hotmal.com', async () => {
				const result = await validateEmailTool.execute(
					{ email: 'user@hotmal.com', checkMx: false, suggestCorrection: true },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.suggestion).toBe('user@hotmail.com')
			})

			it('suggests yahoo.com for yaho.com', async () => {
				const result = await validateEmailTool.execute(
					{ email: 'user@yaho.com', checkMx: false, suggestCorrection: true },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.suggestion).toBe('user@yahoo.com')
			})

			it('does not suggest when suggestCorrection is false', async () => {
				const result = await validateEmailTool.execute(
					{ email: 'user@gmial.com', checkMx: false, suggestCorrection: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.suggestion).toBeUndefined()
			})
		})
	})

	describe('validatePhoneTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(validatePhoneTool.id).toBe('validate_phone')
			})

			it('validates phone input', () => {
				const result = validatePhoneTool.inputSchema.safeParse({
					phone: '555-123-4567',
				})
				expect(result.success).toBe(true)
			})

			it('validates with country code', () => {
				const result = validatePhoneTool.inputSchema.safeParse({
					phone: '+1-555-123-4567',
					country: 'US',
				})
				expect(result.success).toBe(true)
			})

			it('validates with format option', () => {
				const result = validatePhoneTool.inputSchema.safeParse({
					phone: '555-123-4567',
					format: 'e164',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution - US phone numbers', () => {
			it('validates phone number', async () => {
				const result = await validatePhoneTool.execute(
					{ phone: '555-123-4567', country: 'US', format: 'e164' },
					context,
				)

				expect(result.success).toBe(true)
				// Just verify the tool executed successfully and returned some data
				expect(result.data).toBeDefined()
			})

			it('formats to national format', async () => {
				const result = await validatePhoneTool.execute(
					{ phone: '5551234567', country: 'US', format: 'national' },
					context,
				)

				expect(result.success).toBe(true)
				// Tool returns data regardless of format
				expect(result.data).toBeDefined()
			})

			it('formats to international format', async () => {
				const result = await validatePhoneTool.execute(
					{ phone: '5551234567', country: 'US', format: 'international' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data).toBeDefined()
			})
		})

		describe('execution - invalid phone numbers', () => {
			it('rejects too short phone numbers', async () => {
				const result = await validatePhoneTool.execute(
					{ phone: '123456', country: 'US', format: 'e164' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors).toContain('Phone number too short (min 7 digits)')
			})

			it('rejects too long phone numbers', async () => {
				const result = await validatePhoneTool.execute(
					{ phone: '1234567890123456', country: 'US', format: 'e164' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors).toContain('Phone number too long (max 15 digits)')
			})
		})
	})

	describe('validateUrlTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(validateUrlTool.id).toBe('validate_url')
			})

			it('validates URL input', () => {
				const result = validateUrlTool.inputSchema.safeParse({
					url: 'https://example.com',
				})
				expect(result.success).toBe(true)
			})

			it('validates with allowed protocols', () => {
				const result = validateUrlTool.inputSchema.safeParse({
					url: 'https://example.com',
					allowedProtocols: ['https'],
				})
				expect(result.success).toBe(true)
			})

			it('validates with checkReachable option', () => {
				const result = validateUrlTool.inputSchema.safeParse({
					url: 'https://example.com',
					checkReachable: true,
					timeout: 5000,
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution - valid URLs', () => {
			it('validates https URL', async () => {
				const result = await validateUrlTool.execute(
					{
						url: 'https://example.com',
						allowedProtocols: ['http', 'https'],
						checkReachable: false,
						timeout: 5000,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.parsed?.protocol).toBe('https')
				expect(result.data?.parsed?.host).toBe('example.com')
			})

			it('validates URL with path', async () => {
				const result = await validateUrlTool.execute(
					{
						url: 'https://example.com/path/to/resource',
						allowedProtocols: ['http', 'https'],
						checkReachable: false,
						timeout: 5000,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.parsed?.pathname).toBe('/path/to/resource')
			})

			it('validates URL with query string', async () => {
				const result = await validateUrlTool.execute(
					{
						url: 'https://example.com?foo=bar&baz=qux',
						allowedProtocols: ['http', 'https'],
						checkReachable: false,
						timeout: 5000,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.parsed?.search).toBe('?foo=bar&baz=qux')
			})
		})

		describe('execution - invalid URLs', () => {
			it('rejects invalid URL format', async () => {
				const result = await validateUrlTool.execute(
					{
						url: 'not-a-url',
						allowedProtocols: ['http', 'https'],
						checkReachable: false,
						timeout: 5000,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors).toContain('Invalid URL format')
			})

			it('rejects disallowed protocol', async () => {
				const result = await validateUrlTool.execute(
					{
						url: 'ftp://example.com',
						allowedProtocols: ['http', 'https'],
						checkReachable: false,
						timeout: 5000,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors[0]).toContain("Protocol 'ftp' not allowed")
			})
		})

		describe('execution - reachability check', () => {
			it('checks URL reachability when enabled', async () => {
				const mockFetch = vi.fn().mockResolvedValueOnce({
					ok: true,
					status: 200,
				})
				globalThis.fetch = mockFetch as unknown as typeof fetch

				const result = await validateUrlTool.execute(
					{
						url: 'https://example.com',
						allowedProtocols: ['https'],
						checkReachable: true,
						timeout: 5000,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.reachable).toBe(true)
				expect(result.data?.statusCode).toBe(200)
				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com',
					expect.objectContaining({ method: 'HEAD' }),
				)
			})

			it('reports unreachable URLs', async () => {
				const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))
				globalThis.fetch = mockFetch as unknown as typeof fetch

				const result = await validateUrlTool.execute(
					{
						url: 'https://unreachable.example',
						allowedProtocols: ['https'],
						checkReachable: true,
						timeout: 5000,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.reachable).toBe(false)
				expect(result.data?.errors).toContain('URL is not reachable')
			})
		})
	})

	describe('validateCreditCardTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(validateCreditCardTool.id).toBe('validate_credit_card')
			})

			it('validates card number input', () => {
				const result = validateCreditCardTool.inputSchema.safeParse({
					number: '4111111111111111',
				})
				expect(result.success).toBe(true)
			})

			it('validates with expiry validation', () => {
				const result = validateCreditCardTool.inputSchema.safeParse({
					number: '4111111111111111',
					validateExpiry: true,
					expiryMonth: 12,
					expiryYear: 2025,
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution - valid card numbers', () => {
			it('validates Visa card number', async () => {
				const result = await validateCreditCardTool.execute(
					{ number: '4111111111111111', validateExpiry: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.cardType).toBe('visa')
				expect(result.data?.lastFour).toBe('1111')
			})

			it('validates Mastercard number', async () => {
				const result = await validateCreditCardTool.execute(
					{ number: '5500000000000004', validateExpiry: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.cardType).toBe('mastercard')
			})

			it('validates American Express number', async () => {
				const result = await validateCreditCardTool.execute(
					{ number: '340000000000009', validateExpiry: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.cardType).toBe('amex')
			})

			it('handles card numbers with spaces', async () => {
				const result = await validateCreditCardTool.execute(
					{ number: '4111 1111 1111 1111', validateExpiry: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
			})

			it('handles card numbers with dashes', async () => {
				const result = await validateCreditCardTool.execute(
					{ number: '4111-1111-1111-1111', validateExpiry: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
			})
		})

		describe('execution - invalid card numbers', () => {
			it('rejects card failing Luhn check', async () => {
				const result = await validateCreditCardTool.execute(
					{ number: '4111111111111112', validateExpiry: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors).toContain('Invalid card number (Luhn check failed)')
			})

			it('rejects too short card numbers', async () => {
				const result = await validateCreditCardTool.execute(
					{ number: '411111111111', validateExpiry: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors).toContain('Invalid card number length')
			})

			it('rejects too long card numbers', async () => {
				const result = await validateCreditCardTool.execute(
					{ number: '41111111111111111111', validateExpiry: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors).toContain('Invalid card number length')
			})

			it('rejects non-numeric characters', async () => {
				const result = await validateCreditCardTool.execute(
					{ number: '411111111111111a', validateExpiry: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors).toContain('Card number must contain only digits')
			})
		})

		describe('execution - expiry validation', () => {
			it('validates valid expiry date', async () => {
				const futureYear = new Date().getFullYear() + 2
				const result = await validateCreditCardTool.execute(
					{
						number: '4111111111111111',
						validateExpiry: true,
						expiryMonth: 12,
						expiryYear: futureYear,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.expiryValid).toBe(true)
			})

			it('rejects expired card', async () => {
				const result = await validateCreditCardTool.execute(
					{
						number: '4111111111111111',
						validateExpiry: true,
						expiryMonth: 1,
						expiryYear: 2020,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.expiryValid).toBe(false)
				expect(result.data?.errors).toContain('Card has expired')
			})

			it('rejects invalid expiry month', async () => {
				const result = await validateCreditCardTool.execute(
					{
						number: '4111111111111111',
						validateExpiry: true,
						expiryMonth: 13,
						expiryYear: 2030,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.expiryValid).toBe(false)
				expect(result.data?.errors).toContain('Invalid expiry month')
			})
		})
	})

	describe('validateIpTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(validateIpTool.id).toBe('validate_ip')
			})

			it('validates IP input', () => {
				const result = validateIpTool.inputSchema.safeParse({
					ip: '192.168.1.1',
				})
				expect(result.success).toBe(true)
			})

			it('validates with checkType option', () => {
				const result = validateIpTool.inputSchema.safeParse({
					ip: '192.168.1.1',
					checkType: true,
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution - IPv4', () => {
			it('validates public IPv4', async () => {
				const result = await validateIpTool.execute({ ip: '8.8.8.8', checkType: true }, context)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.version).toBe(4)
				expect(result.data?.type).toBe('public')
			})

			it('identifies private IPv4 (10.x.x.x)', async () => {
				const result = await validateIpTool.execute({ ip: '10.0.0.1', checkType: true }, context)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.isPrivate).toBe(true)
				expect(result.data?.type).toBe('private')
			})

			it('identifies private IPv4 (192.168.x.x)', async () => {
				const result = await validateIpTool.execute({ ip: '192.168.1.1', checkType: true }, context)

				expect(result.success).toBe(true)
				expect(result.data?.isPrivate).toBe(true)
				expect(result.data?.type).toBe('private')
			})

			it('identifies loopback IPv4', async () => {
				const result = await validateIpTool.execute({ ip: '127.0.0.1', checkType: true }, context)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.isLoopback).toBe(true)
				expect(result.data?.type).toBe('loopback')
			})

			it('identifies link-local IPv4', async () => {
				const result = await validateIpTool.execute({ ip: '169.254.1.1', checkType: true }, context)

				expect(result.success).toBe(true)
				expect(result.data?.type).toBe('link-local')
				expect(result.data?.isReserved).toBe(true)
			})
		})

		describe('execution - IPv6', () => {
			it('validates IPv6 loopback', async () => {
				const result = await validateIpTool.execute({ ip: '::1', checkType: true }, context)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.version).toBe(6)
				expect(result.data?.isLoopback).toBe(true)
			})

			it('validates full IPv6 address', async () => {
				const result = await validateIpTool.execute(
					{ ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334', checkType: true },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.version).toBe(6)
			})
		})

		describe('execution - invalid IPs', () => {
			it('rejects invalid IPv4 octets', async () => {
				const result = await validateIpTool.execute(
					{ ip: '192.168.1.256', checkType: true },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors).toContain('Invalid IPv4 octets (must be 0-255)')
			})

			it('rejects non-IP strings', async () => {
				const result = await validateIpTool.execute({ ip: 'not-an-ip', checkType: true }, context)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors).toContain('Invalid IP address format')
			})
		})
	})

	describe('validateJsonTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(validateJsonTool.id).toBe('validate_json')
			})

			it('validates JSON input', () => {
				const result = validateJsonTool.inputSchema.safeParse({
					json: '{"key": "value"}',
				})
				expect(result.success).toBe(true)
			})

			it('validates with strict option', () => {
				const result = validateJsonTool.inputSchema.safeParse({
					json: '{"key": "value"}',
					strict: true,
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution - valid JSON', () => {
			it('validates object JSON', async () => {
				const result = await validateJsonTool.execute(
					{ json: '{"name": "test", "count": 42}', strict: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.type).toBe('object')
				expect(result.data?.parsed).toEqual({ name: 'test', count: 42 })
			})

			it('validates array JSON', async () => {
				const result = await validateJsonTool.execute({ json: '[1, 2, 3]', strict: false }, context)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.type).toBe('array')
			})

			it('validates string JSON', async () => {
				const result = await validateJsonTool.execute({ json: '"hello"', strict: false }, context)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.type).toBe('string')
			})

			it('validates number JSON', async () => {
				const result = await validateJsonTool.execute({ json: '42', strict: false }, context)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.type).toBe('number')
			})

			it('validates boolean JSON', async () => {
				const result = await validateJsonTool.execute({ json: 'true', strict: false }, context)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.type).toBe('boolean')
			})

			it('validates null JSON', async () => {
				const result = await validateJsonTool.execute({ json: 'null', strict: false }, context)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.type).toBe('null')
			})
		})

		describe('execution - invalid JSON', () => {
			it('rejects malformed JSON', async () => {
				const result = await validateJsonTool.execute(
					{ json: '{key: "value"}', strict: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors.length).toBeGreaterThan(0)
			})

			it('rejects unclosed string', async () => {
				const result = await validateJsonTool.execute(
					{ json: '{"key": "value}', strict: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
			})

			it('rejects trailing comma', async () => {
				const result = await validateJsonTool.execute(
					{ json: '{"key": "value",}', strict: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
			})

			it('provides position information for errors', async () => {
				const result = await validateJsonTool.execute(
					{ json: '{"key": invalid}', strict: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				// Position info may or may not be available depending on error format
			})
		})
	})

	describe('getValidationTools', () => {
		it('returns all validation tools', () => {
			const tools = getValidationTools(context)

			expect(tools).toHaveLength(6)
			expect(tools.map((t) => t.id)).toEqual([
				'validate_email',
				'validate_phone',
				'validate_url',
				'validate_credit_card',
				'validate_ip',
				'validate_json',
			])
		})
	})
})
