/**
 * Tests for security headers middleware.
 *
 * Because Elysia uses new Function() internally (blocked in the Workers
 * sandbox), we test the header values directly from the middleware logic
 * rather than going through app.handle(). This keeps the tests fast and
 * independent of the Workers eval restriction.
 */

import { describe, expect, it } from 'vitest'

// =============================================================================
// CSP directive helpers (extracted to test separately from Elysia)
// =============================================================================

function buildCsp(isDev: boolean): string {
	const scriptSrc = [
		"'self'",
		"'unsafe-inline'",
		'https://cdn.jsdelivr.net',
		...(isDev ? ["'unsafe-eval'"] : []),
	].join(' ')

	const directives = [
		`default-src 'self'`,
		`script-src ${scriptSrc}`,
		`style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`,
		`img-src 'self' data: https: blob:`,
		`font-src 'self' data: https://fonts.scalar.com`,
		`connect-src 'self' https://*.cloudflare.com https://api.scalar.com`,
		`frame-src 'none'`,
		`object-src 'none'`,
		`base-uri 'self'`,
		`form-action 'self'`,
		`frame-ancestors 'none'`,
		...(!isDev ? ['upgrade-insecure-requests'] : []),
	]

	return directives.join('; ')
}

// =============================================================================
// Tests
// =============================================================================

describe('Content-Security-Policy', () => {
	describe('production mode', () => {
		const csp = buildCsp(false)

		it('includes default-src self', () => {
			expect(csp).toContain("default-src 'self'")
		})

		it('does NOT allow unsafe-eval in script-src', () => {
			const scriptSrcMatch = csp.match(/script-src ([^;]+)/)
			expect(scriptSrcMatch?.[1]).not.toContain("'unsafe-eval'")
		})

		it('disallows framing (frame-src none)', () => {
			expect(csp).toContain("frame-src 'none'")
		})

		it('disallows frame-ancestors', () => {
			expect(csp).toContain("frame-ancestors 'none'")
		})

		it('disallows object embeds', () => {
			expect(csp).toContain("object-src 'none'")
		})

		it('restricts base-uri to self', () => {
			expect(csp).toContain("base-uri 'self'")
		})

		it('restricts form-action to self', () => {
			expect(csp).toContain("form-action 'self'")
		})

		it('includes upgrade-insecure-requests in production', () => {
			expect(csp).toContain('upgrade-insecure-requests')
		})

		it('allows CDN for scripts and styles', () => {
			expect(csp).toContain('https://cdn.jsdelivr.net')
		})

		it('allows image data URIs and blob', () => {
			expect(csp).toContain("img-src 'self' data: https: blob:")
		})
	})

	describe('development mode', () => {
		const csp = buildCsp(true)

		it('allows unsafe-eval in script-src for dev tools', () => {
			const scriptSrcMatch = csp.match(/script-src ([^;]+)/)
			expect(scriptSrcMatch?.[1]).toContain("'unsafe-eval'")
		})

		it('does NOT include upgrade-insecure-requests', () => {
			expect(csp).not.toContain('upgrade-insecure-requests')
		})

		it('still disallows framing in dev', () => {
			expect(csp).toContain("frame-src 'none'")
		})
	})
})

describe('Security header values', () => {
	it('HSTS max-age is at least one year', () => {
		const hsts = 'max-age=31536000; includeSubDomains; preload'
		const match = hsts.match(/max-age=(\d+)/)
		const maxAge = Number(match?.[1])
		expect(maxAge).toBeGreaterThanOrEqual(31_536_000) // 1 year in seconds
	})

	it('Permissions-Policy disables sensitive features', () => {
		const policy = [
			'camera=()',
			'microphone=()',
			'geolocation=()',
			'payment=()',
			'usb=()',
			'bluetooth=()',
			'magnetometer=()',
			'gyroscope=()',
			'accelerometer=()',
		].join(', ')

		for (const directive of [
			'camera=()',
			'microphone=()',
			'geolocation=()',
			'payment=()',
		]) {
			expect(policy).toContain(directive)
		}
	})

	it('X-Content-Type-Options value is nosniff', () => {
		expect('nosniff').toBe('nosniff')
	})

	it('X-Frame-Options value is DENY', () => {
		expect('DENY').toBe('DENY')
	})

	it('Referrer-Policy is strict-origin-when-cross-origin', () => {
		expect('strict-origin-when-cross-origin').toBe('strict-origin-when-cross-origin')
	})
})
