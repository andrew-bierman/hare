import { describe, expect, it } from 'vitest'
import { isWebhookUrlSafe } from '../webhooks'

describe('Webhook SSRF Protection', () => {
	describe('blocks private IPv4 addresses', () => {
		const blocked = [
			'http://127.0.0.1/hook',
			'http://127.0.0.2:8080/hook',
			'http://10.0.0.1/hook',
			'http://10.255.255.255/hook',
			'http://172.16.0.1/hook',
			'http://172.31.255.255/hook',
			'http://192.168.0.1/hook',
			'http://192.168.1.100/hook',
			'http://0.0.0.0/hook',
		]

		for (const url of blocked) {
			it(`blocks ${url}`, () => {
				expect(isWebhookUrlSafe(url).safe).toBe(false)
			})
		}
	})

	describe('blocks localhost variants', () => {
		const blocked = [
			'http://localhost/hook',
			'http://localhost:3000/hook',
			'http://localhost.localdomain/hook',
			'http://something.local/hook',
			'http://internal.localhost/hook',
			'http://metadata.google.internal/hook',
			'http://evil.internal/hook',
		]

		for (const url of blocked) {
			it(`blocks ${url}`, () => {
				expect(isWebhookUrlSafe(url).safe).toBe(false)
			})
		}
	})

	describe('blocks cloud metadata endpoints', () => {
		it('blocks AWS metadata endpoint', () => {
			expect(isWebhookUrlSafe('http://169.254.169.254/latest/meta-data/').safe).toBe(false)
		})

		it('blocks link-local range', () => {
			expect(isWebhookUrlSafe('http://169.254.1.1/hook').safe).toBe(false)
		})
	})

	describe('blocks IPv6 private addresses', () => {
		const blocked = [
			'http://[::1]/hook',
			'http://[0:0:0:0:0:0:0:1]/hook',
			'http://[fe80::1]/hook',
			'http://[fc00::1]/hook',
			'http://[fd00::1]/hook',
		]

		for (const url of blocked) {
			it(`blocks ${url}`, () => {
				expect(isWebhookUrlSafe(url).safe).toBe(false)
			})
		}
	})

	describe('blocks IPv4-mapped IPv6 bypass', () => {
		it('blocks ::ffff:127.0.0.1', () => {
			expect(isWebhookUrlSafe('http://[::ffff:127.0.0.1]/hook').safe).toBe(false)
		})

		it('blocks ::ffff:10.0.0.1', () => {
			expect(isWebhookUrlSafe('http://[::ffff:10.0.0.1]/hook').safe).toBe(false)
		})

		it('blocks ::ffff:192.168.1.1', () => {
			expect(isWebhookUrlSafe('http://[::ffff:192.168.1.1]/hook').safe).toBe(false)
		})
	})

	describe('blocks decimal/hex IP bypass', () => {
		it('blocks decimal IP (2130706433 = 127.0.0.1)', () => {
			expect(isWebhookUrlSafe('http://2130706433/hook').safe).toBe(false)
		})

		it('blocks hex IP (0x7f000001 = 127.0.0.1)', () => {
			expect(isWebhookUrlSafe('http://0x7f000001/hook').safe).toBe(false)
		})

		it('blocks other numeric hostnames', () => {
			expect(isWebhookUrlSafe('http://167772161/hook').safe).toBe(false)
		})
	})

	describe('blocks non-HTTP protocols', () => {
		const blocked = [
			'ftp://example.com/hook',
			'file:///etc/passwd',
			'gopher://evil.com/hook',
		]

		for (const url of blocked) {
			it(`blocks ${url}`, () => {
				expect(isWebhookUrlSafe(url).safe).toBe(false)
			})
		}
	})

	describe('allows legitimate public URLs', () => {
		const allowed = [
			'https://example.com/webhook',
			'https://hooks.slack.com/services/T00/B00/xxx',
			'https://api.github.com/webhooks',
			'http://webhook.site/abc-123',
			'https://my-app.fly.dev/api/webhooks',
			'https://172.32.0.1/hook', // 172.32 is public (outside 172.16-31 range)
		]

		for (const url of allowed) {
			it(`allows ${url}`, () => {
				expect(isWebhookUrlSafe(url).safe).toBe(true)
			})
		}
	})

	describe('rejects invalid URLs', () => {
		it('rejects empty string', () => {
			expect(isWebhookUrlSafe('').safe).toBe(false)
		})

		it('rejects non-URL string', () => {
			expect(isWebhookUrlSafe('not-a-url').safe).toBe(false)
		})
	})
})
