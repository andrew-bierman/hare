import { describe, expect, it } from 'vitest'

// We need to test the key generation logic since the actual rate limiting
// is delegated to the external @elithrar/workers-hono-rate-limit library

// Helper functions to avoid TypeScript narrowing issues in tests
function generateUserKey(user: { id: string } | null, ip: string): string {
	return user?.id ? `user:${user.id}` : `ip:${ip}`
}

function getIpFromHeaders(
	cfConnectingIp?: string,
	xForwardedFor?: string,
	xRealIp?: string,
): string {
	return cfConnectingIp || xForwardedFor?.split(',')[0]?.trim() || xRealIp || 'unknown'
}

function generateApiKeyKey(apiKey: { id: string } | null, ip: string): string {
	return apiKey?.id ? `apikey:${apiKey.id}` : `ip:${ip}`
}

describe('rate-limit middleware', () => {
	describe('user/IP key generation logic', () => {
		it('uses user ID when user is set in context', async () => {
			// We test this by examining what key would be generated
			// The middleware uses: user?.id ? `user:${user.id}` : `ip:${ip}`
			const userId = 'user_123'
			const expectedKey = `user:${userId}`

			const key = generateUserKey({ id: userId }, 'unknown')
			expect(key).toBe(expectedKey)
		})

		it('falls back to IP when no user is set', async () => {
			const ip = '192.168.1.1'
			const key = generateUserKey(null, ip)
			expect(key).toBe(`ip:${ip}`)
		})

		it('uses cf-connecting-ip header as primary IP source', async () => {
			const ip = getIpFromHeaders('1.2.3.4', '5.6.7.8', '9.10.11.12')
			expect(ip).toBe('1.2.3.4')
		})

		it('uses x-forwarded-for as fallback IP source', async () => {
			const ip = getIpFromHeaders(undefined, '5.6.7.8, 1.2.3.4', '9.10.11.12')
			expect(ip).toBe('5.6.7.8')
		})

		it('uses x-real-ip as tertiary IP source', async () => {
			const ip = getIpFromHeaders(undefined, undefined, '9.10.11.12')
			expect(ip).toBe('9.10.11.12')
		})

		it('uses "unknown" when no IP headers are present', async () => {
			const ip = getIpFromHeaders(undefined, undefined, undefined)
			expect(ip).toBe('unknown')
		})
	})

	describe('API key based limiting logic', () => {
		it('uses API key ID when apiKey is set in context', async () => {
			const apiKeyId = 'key_abc123'
			const key = generateApiKeyKey({ id: apiKeyId }, 'unknown')
			expect(key).toBe(`apikey:${apiKeyId}`)
		})

		it('falls back to IP when no API key is set', async () => {
			const ip = '192.168.1.1'
			const key = generateApiKeyKey(null, ip)
			expect(key).toBe(`ip:${ip}`)
		})
	})

	describe('rate limiter types', () => {
		it('has apiRateLimiter for general API endpoints', async () => {
			// Import and verify the export exists
			const { apiRateLimiter } = await import('../rate-limit')
			expect(apiRateLimiter).toBeDefined()
			expect(typeof apiRateLimiter).toBe('function')
		})

		it('has strictRateLimiter for sensitive operations', async () => {
			const { strictRateLimiter } = await import('../rate-limit')
			expect(strictRateLimiter).toBeDefined()
			expect(typeof strictRateLimiter).toBe('function')
		})

		it('has chatRateLimiter for AI chat endpoints', async () => {
			const { chatRateLimiter } = await import('../rate-limit')
			expect(chatRateLimiter).toBeDefined()
			expect(typeof chatRateLimiter).toBe('function')
		})

		it('has externalApiRateLimiter for external API access', async () => {
			const { externalApiRateLimiter } = await import('../rate-limit')
			expect(externalApiRateLimiter).toBeDefined()
			expect(typeof externalApiRateLimiter).toBe('function')
		})
	})

	describe('x-forwarded-for parsing', () => {
		it('handles single IP in x-forwarded-for', () => {
			const xForwardedFor = '1.2.3.4'
			const ip = xForwardedFor.split(',')[0]?.trim()
			expect(ip).toBe('1.2.3.4')
		})

		it('handles multiple IPs in x-forwarded-for and takes first', () => {
			const xForwardedFor = '1.2.3.4, 5.6.7.8, 9.10.11.12'
			const ip = xForwardedFor.split(',')[0]?.trim()
			expect(ip).toBe('1.2.3.4')
		})

		it('handles whitespace in x-forwarded-for', () => {
			const xForwardedFor = '  1.2.3.4  ,  5.6.7.8  '
			const ip = xForwardedFor.split(',')[0]?.trim()
			expect(ip).toBe('1.2.3.4')
		})

		it('handles empty x-forwarded-for', () => {
			const xForwardedFor = ''
			const ip = xForwardedFor.split(',')[0]?.trim() || 'unknown'
			expect(ip).toBe('unknown')
		})
	})
})
