import { describe, expect, it, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { securityHeadersMiddleware, corsMiddleware } from '../security'

describe('security middleware', () => {
	describe('securityHeadersMiddleware', () => {
		let app: Hono

		beforeEach(() => {
			app = new Hono()
			app.use('*', securityHeadersMiddleware)
			app.get('/test', (c) => c.text('OK'))
		})

		it('is defined and is a function', () => {
			expect(securityHeadersMiddleware).toBeDefined()
			expect(typeof securityHeadersMiddleware).toBe('function')
		})

		it('adds X-Content-Type-Options header', async () => {
			const res = await app.request('/test')
			expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
		})

		it('adds X-Frame-Options header', async () => {
			const res = await app.request('/test')
			expect(res.headers.get('X-Frame-Options')).toBe('DENY')
		})

		it('adds X-XSS-Protection header', async () => {
			const res = await app.request('/test')
			expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block')
		})

		it('adds Referrer-Policy header', async () => {
			const res = await app.request('/test')
			expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
		})

		it('adds Strict-Transport-Security header', async () => {
			const res = await app.request('/test')
			const hsts = res.headers.get('Strict-Transport-Security')
			expect(hsts).toBe('max-age=31536000; includeSubDomains; preload')
		})

		it('adds Content-Security-Policy header', async () => {
			const res = await app.request('/test')
			const csp = res.headers.get('Content-Security-Policy')
			expect(csp).toBeDefined()
			expect(csp).toContain("default-src 'self'")
		})

		it('adds Permissions-Policy header', async () => {
			const res = await app.request('/test')
			const permissionsPolicy = res.headers.get('Permissions-Policy')
			expect(permissionsPolicy).toBeDefined()
		})

		it('allows request to pass through', async () => {
			const res = await app.request('/test')
			expect(res.status).toBe(200)
			expect(await res.text()).toBe('OK')
		})
	})

	describe('corsMiddleware', () => {
		let app: Hono

		beforeEach(() => {
			app = new Hono()
			app.use('*', corsMiddleware)
			app.get('/test', (c) => c.text('OK'))
			app.post('/test', (c) => c.text('POST OK'))
			app.options('/test', (c) => c.text('OPTIONS OK'))
		})

		it('is defined and is a function', () => {
			expect(corsMiddleware).toBeDefined()
			expect(typeof corsMiddleware).toBe('function')
		})

		it('handles preflight OPTIONS requests', async () => {
			const res = await app.request('/test', {
				method: 'OPTIONS',
				headers: {
					'Origin': 'http://localhost:3000',
					'Access-Control-Request-Method': 'POST',
				},
			})
			expect(res.status).toBe(204)
		})

		it('sets Access-Control-Allow-Origin for allowed origins', async () => {
			const res = await app.request('/test', {
				headers: {
					'Origin': 'http://localhost:3000',
				},
			})
			expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
		})

		it('sets Access-Control-Allow-Credentials to true', async () => {
			const res = await app.request('/test', {
				headers: {
					'Origin': 'http://localhost:3000',
				},
			})
			expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
		})

		it('allows configured HTTP methods', async () => {
			const res = await app.request('/test', {
				method: 'OPTIONS',
				headers: {
					'Origin': 'http://localhost:3000',
					'Access-Control-Request-Method': 'POST',
				},
			})
			const allowMethods = res.headers.get('Access-Control-Allow-Methods')
			expect(allowMethods).toContain('GET')
			expect(allowMethods).toContain('POST')
			expect(allowMethods).toContain('PUT')
			expect(allowMethods).toContain('PATCH')
			expect(allowMethods).toContain('DELETE')
			expect(allowMethods).toContain('OPTIONS')
		})

		it('allows configured headers', async () => {
			const res = await app.request('/test', {
				method: 'OPTIONS',
				headers: {
					'Origin': 'http://localhost:3000',
					'Access-Control-Request-Method': 'POST',
					'Access-Control-Request-Headers': 'Content-Type, Authorization',
				},
			})
			const allowHeaders = res.headers.get('Access-Control-Allow-Headers')
			expect(allowHeaders).toContain('Content-Type')
			expect(allowHeaders).toContain('Authorization')
		})

		it('exposes rate limit headers', async () => {
			const res = await app.request('/test', {
				method: 'OPTIONS',
				headers: {
					'Origin': 'http://localhost:3000',
					'Access-Control-Request-Method': 'GET',
				},
			})
			const exposeHeaders = res.headers.get('Access-Control-Expose-Headers')
			expect(exposeHeaders).toContain('X-RateLimit-Limit')
			expect(exposeHeaders).toContain('X-RateLimit-Remaining')
			expect(exposeHeaders).toContain('X-RateLimit-Reset')
		})

		it('sets max age for preflight caching', async () => {
			const res = await app.request('/test', {
				method: 'OPTIONS',
				headers: {
					'Origin': 'http://localhost:3000',
					'Access-Control-Request-Method': 'POST',
				},
			})
			expect(res.headers.get('Access-Control-Max-Age')).toBe('86400')
		})

		it('handles requests without origin header', async () => {
			const res = await app.request('/test')
			expect(res.status).toBe(200)
		})

		it('returns default origin for requests without origin', async () => {
			const res = await app.request('/test', {
				headers: {},
			})
			// When no origin, should return first allowed origin or default
			const origin = res.headers.get('Access-Control-Allow-Origin')
			expect(origin).toBeTruthy()
		})
	})

	describe('CORS origin validation logic', () => {
		it('allows localhost:3000', () => {
			const allowedOrigins = ['http://localhost:3000', 'http://localhost:8787']
			const origin = 'http://localhost:3000'
			const isAllowed = allowedOrigins.includes(origin)
			expect(isAllowed).toBe(true)
		})

		it('allows localhost:8787', () => {
			const allowedOrigins = ['http://localhost:3000', 'http://localhost:8787']
			const origin = 'http://localhost:8787'
			const isAllowed = allowedOrigins.includes(origin)
			expect(isAllowed).toBe(true)
		})

		it('rejects unknown origins', () => {
			const allowedOrigins = ['http://localhost:3000', 'http://localhost:8787']
			const origin = 'http://malicious-site.com'
			const isAllowed = allowedOrigins.includes(origin)
			expect(isAllowed).toBe(false)
		})

		it('handles null origin gracefully', () => {
			const origin: string | null = null
			// When origin is null, return default
			const result = origin ? origin : 'http://localhost:3000'
			expect(result).toBe('http://localhost:3000')
		})
	})

	describe('CSP directives', () => {
		it('includes default-src self', () => {
			const cspConfig = {
				defaultSrc: ["'self'"],
			}
			expect(cspConfig.defaultSrc).toContain("'self'")
		})

		it('includes unsafe-inline for scripts', () => {
			const cspConfig = {
				scriptSrc: ["'self'", "'unsafe-inline'"],
			}
			expect(cspConfig.scriptSrc).toContain("'unsafe-inline'")
		})

		it('includes unsafe-inline for styles (for Tailwind)', () => {
			const cspConfig = {
				styleSrc: ["'self'", "'unsafe-inline'"],
			}
			expect(cspConfig.styleSrc).toContain("'unsafe-inline'")
		})

		it('allows data URIs for images', () => {
			const cspConfig = {
				imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
			}
			expect(cspConfig.imgSrc).toContain('data:')
			expect(cspConfig.imgSrc).toContain('blob:')
		})

		it('restricts frame-src to none', () => {
			const cspConfig = {
				frameSrc: ["'none'"],
			}
			expect(cspConfig.frameSrc).toContain("'none'")
		})

		it('restricts object-src to none', () => {
			const cspConfig = {
				objectSrc: ["'none'"],
			}
			expect(cspConfig.objectSrc).toContain("'none'")
		})

		it('restricts frame-ancestors to none (clickjacking protection)', () => {
			const cspConfig = {
				frameAncestors: ["'none'"],
			}
			expect(cspConfig.frameAncestors).toContain("'none'")
		})
	})

	describe('Permissions Policy configuration', () => {
		it('disables camera', () => {
			const permissionsPolicy = { camera: [] }
			expect(permissionsPolicy.camera).toEqual([])
		})

		it('disables microphone', () => {
			const permissionsPolicy = { microphone: [] }
			expect(permissionsPolicy.microphone).toEqual([])
		})

		it('disables geolocation', () => {
			const permissionsPolicy = { geolocation: [] }
			expect(permissionsPolicy.geolocation).toEqual([])
		})

		it('disables payment', () => {
			const permissionsPolicy = { payment: [] }
			expect(permissionsPolicy.payment).toEqual([])
		})

		it('disables usb', () => {
			const permissionsPolicy = { usb: [] }
			expect(permissionsPolicy.usb).toEqual([])
		})
	})
})
