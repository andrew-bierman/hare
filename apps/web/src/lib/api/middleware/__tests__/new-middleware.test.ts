import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { requestId } from '../request-id'
import { secureHeaders } from '../secure-headers'
import { timing } from '../timing'

describe('requestId middleware', () => {
	it('generates a new request ID when none exists', async () => {
		const app = new Hono()
		app.use('*', requestId())
		app.get('/', (c) => c.json({ ok: true }))

		const res = await app.request('/')
		const requestIdHeader = res.headers.get('X-Request-ID')

		expect(requestIdHeader).toBeTruthy()
		expect(requestIdHeader).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		)
	})

	it('uses existing request ID from header', async () => {
		const app = new Hono()
		app.use('*', requestId())
		app.get('/', (c) => c.json({ ok: true }))

		const existingId = 'existing-request-id-123'
		const res = await app.request('/', {
			headers: { 'X-Request-ID': existingId },
		})

		expect(res.headers.get('X-Request-ID')).toBe(existingId)
	})
})

describe('secureHeaders middleware', () => {
	it('sets default security headers', async () => {
		const app = new Hono()
		app.use('*', secureHeaders())
		app.get('/', (c) => c.json({ ok: true }))

		const res = await app.request('/')

		expect(res.headers.get('Content-Security-Policy')).toBeTruthy()
		expect(res.headers.get('Strict-Transport-Security')).toBeTruthy()
		expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
		expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
		expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block')
		expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
		expect(res.headers.get('Permissions-Policy')).toBeTruthy()
	})

	it('allows custom CSP', async () => {
		const app = new Hono()
		const customCsp = "default-src 'self'"
		app.use('*', secureHeaders({ contentSecurityPolicy: customCsp }))
		app.get('/', (c) => c.json({ ok: true }))

		const res = await app.request('/')

		expect(res.headers.get('Content-Security-Policy')).toBe(customCsp)
	})

	it('default CSP does not include unsafe-inline or unsafe-eval', async () => {
		const app = new Hono()
		app.use('*', secureHeaders())
		app.get('/', (c) => c.json({ ok: true }))

		const res = await app.request('/')
		const csp = res.headers.get('Content-Security-Policy')

		expect(csp).toBeTruthy()
		expect(csp).not.toContain('unsafe-inline')
		expect(csp).not.toContain('unsafe-eval')
	})

	it('allows disabling specific headers', async () => {
		const app = new Hono()
		app.use('*', secureHeaders({ xFrameOptions: false, permissionsPolicy: false }))
		app.get('/', (c) => c.json({ ok: true }))

		const res = await app.request('/')

		expect(res.headers.get('X-Frame-Options')).toBeNull()
		expect(res.headers.get('Permissions-Policy')).toBeNull()
		expect(res.headers.get('Content-Security-Policy')).toBeTruthy() // others still set
	})
})

describe('timing middleware', () => {
	it('adds Server-Timing header with total duration', async () => {
		const app = new Hono()
		app.use('*', timing())
		app.get('/', async (c) => {
			// Simulate some work
			await new Promise((resolve) => setTimeout(resolve, 10))
			return c.json({ ok: true })
		})

		const res = await app.request('/')
		const serverTiming = res.headers.get('Server-Timing')

		expect(serverTiming).toBeTruthy()
		expect(serverTiming).toContain('total;dur=')
		expect(serverTiming).toContain('desc="Total request time"')
	})

	it('allows adding custom timings', async () => {
		const app = new Hono()
		app.use('*', timing())
		app.get('/', async (c) => {
			const addTiming = c.get('addTiming')
			if (addTiming && typeof addTiming === 'function') {
				addTiming('db-query', 15.5, 'Database query time')
				addTiming('cache-check', 5.2, 'Cache lookup')
			}
			return c.json({ ok: true })
		})

		const res = await app.request('/')
		const serverTiming = res.headers.get('Server-Timing')

		expect(serverTiming).toBeTruthy()
		expect(serverTiming).toContain('db-query;dur=15.50;desc="Database query time"')
		expect(serverTiming).toContain('cache-check;dur=5.20;desc="Cache lookup"')
		expect(serverTiming).toContain('total;dur=')
	})
})
