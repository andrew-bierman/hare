import { describe, expect, it } from 'vitest'
import {
	parseIPv4,
	isPrivateIPv4,
	isPrivateIPv6,
	isBlockedHost,
	isUrlSafe,
	isRedirectSafe,
	MAX_REDIRECT_HOPS,
} from '../ssrf'

describe('SSRF Consolidated Module', () => {
	describe('parseIPv4', () => {
		it('parses valid dotted-decimal IPv4', () => {
			expect(parseIPv4('192.168.1.1')).toEqual([192, 168, 1, 1])
		})

		it('parses 0.0.0.0', () => {
			expect(parseIPv4('0.0.0.0')).toEqual([0, 0, 0, 0])
		})

		it('parses 255.255.255.255', () => {
			expect(parseIPv4('255.255.255.255')).toEqual([255, 255, 255, 255])
		})

		it('returns null for too few octets', () => {
			expect(parseIPv4('192.168.1')).toBeNull()
		})

		it('returns null for too many octets', () => {
			expect(parseIPv4('192.168.1.1.1')).toBeNull()
		})

		it('returns null for non-numeric values', () => {
			expect(parseIPv4('abc.def.ghi.jkl')).toBeNull()
		})

		it('returns null for out-of-range octets', () => {
			expect(parseIPv4('256.1.1.1')).toBeNull()
		})

		it('returns null for negative octets', () => {
			expect(parseIPv4('-1.0.0.0')).toBeNull()
		})

		it('returns null for leading zeros (octal ambiguity)', () => {
			expect(parseIPv4('01.0.0.0')).toBeNull()
		})

		it('returns null for empty string', () => {
			expect(parseIPv4('')).toBeNull()
		})
	})

	describe('isPrivateIPv4', () => {
		it('blocks loopback (127.x)', () => {
			expect(isPrivateIPv4([127, 0, 0, 1])).toBe(true)
			expect(isPrivateIPv4([127, 255, 255, 255])).toBe(true)
		})

		it('blocks Class A private (10.x)', () => {
			expect(isPrivateIPv4([10, 0, 0, 1])).toBe(true)
			expect(isPrivateIPv4([10, 255, 255, 255])).toBe(true)
		})

		it('blocks Class B private (172.16-31.x)', () => {
			expect(isPrivateIPv4([172, 16, 0, 1])).toBe(true)
			expect(isPrivateIPv4([172, 31, 255, 255])).toBe(true)
		})

		it('allows non-private 172.x ranges', () => {
			expect(isPrivateIPv4([172, 15, 0, 1])).toBe(false)
			expect(isPrivateIPv4([172, 32, 0, 1])).toBe(false)
		})

		it('blocks Class C private (192.168.x)', () => {
			expect(isPrivateIPv4([192, 168, 0, 1])).toBe(true)
			expect(isPrivateIPv4([192, 168, 255, 255])).toBe(true)
		})

		it('blocks link-local (169.254.x)', () => {
			expect(isPrivateIPv4([169, 254, 169, 254])).toBe(true)
		})

		it('blocks current network (0.x)', () => {
			expect(isPrivateIPv4([0, 0, 0, 0])).toBe(true)
		})

		it('blocks multicast (224-239.x)', () => {
			expect(isPrivateIPv4([224, 0, 0, 1])).toBe(true)
			expect(isPrivateIPv4([239, 255, 255, 255])).toBe(true)
		})

		it('blocks reserved (240+)', () => {
			expect(isPrivateIPv4([240, 0, 0, 1])).toBe(true)
			expect(isPrivateIPv4([255, 255, 255, 255])).toBe(true)
		})

		it('allows public IPs', () => {
			expect(isPrivateIPv4([8, 8, 8, 8])).toBe(false)
			expect(isPrivateIPv4([1, 1, 1, 1])).toBe(false)
			expect(isPrivateIPv4([93, 184, 216, 34])).toBe(false)
		})

		it('returns false for short arrays', () => {
			expect(isPrivateIPv4([127])).toBe(false)
			expect(isPrivateIPv4([])).toBe(false)
		})
	})

	describe('isPrivateIPv6', () => {
		it('blocks loopback ::1', () => {
			expect(isPrivateIPv6('::1')).toBe(true)
			expect(isPrivateIPv6('0:0:0:0:0:0:0:1')).toBe(true)
		})

		it('blocks unspecified ::', () => {
			expect(isPrivateIPv6('::')).toBe(true)
			expect(isPrivateIPv6('0:0:0:0:0:0:0:0')).toBe(true)
		})

		it('blocks link-local fe80::/10', () => {
			expect(isPrivateIPv6('fe80::1')).toBe(true)
			expect(isPrivateIPv6('fe90::1')).toBe(true)
			expect(isPrivateIPv6('fea0::1')).toBe(true)
			expect(isPrivateIPv6('feb0::1')).toBe(true)
		})

		it('blocks unique local fc00::/7', () => {
			expect(isPrivateIPv6('fc00::1')).toBe(true)
			expect(isPrivateIPv6('fd00::1')).toBe(true)
		})

		it('blocks IPv4-mapped IPv6 with private dotted form (::ffff:127.0.0.1)', () => {
			expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true)
			expect(isPrivateIPv6('::ffff:10.0.0.1')).toBe(true)
			expect(isPrivateIPv6('::ffff:192.168.1.1')).toBe(true)
		})

		it('blocks IPv4-mapped IPv6 with hex-word form (::ffff:7f00:1)', () => {
			expect(isPrivateIPv6('::ffff:7f00:1')).toBe(true)
		})

		it('allows IPv4-mapped IPv6 with public IPs', () => {
			expect(isPrivateIPv6('::ffff:8.8.8.8')).toBe(false)
		})

		it('allows public IPv6 addresses', () => {
			expect(isPrivateIPv6('2001:db8::1')).toBe(false)
			expect(isPrivateIPv6('2607:f8b0:4004:800::200e')).toBe(false)
		})

		it('is case-insensitive', () => {
			expect(isPrivateIPv6('FE80::1')).toBe(true)
			expect(isPrivateIPv6('FC00::1')).toBe(true)
		})
	})

	describe('isBlockedHost', () => {
		it('blocks localhost', () => {
			expect(isBlockedHost('localhost').blocked).toBe(true)
		})

		it('blocks localhost.localdomain', () => {
			expect(isBlockedHost('localhost.localdomain').blocked).toBe(true)
		})

		it('blocks metadata.google.internal', () => {
			expect(isBlockedHost('metadata.google.internal').blocked).toBe(true)
		})

		it('blocks .internal suffix', () => {
			expect(isBlockedHost('evil.internal').blocked).toBe(true)
		})

		it('blocks .local suffix', () => {
			expect(isBlockedHost('myhost.local').blocked).toBe(true)
		})

		it('blocks .localhost suffix', () => {
			expect(isBlockedHost('app.localhost').blocked).toBe(true)
		})

		it('blocks decimal IP (2130706433 = 127.0.0.1)', () => {
			const result = isBlockedHost('2130706433')
			expect(result.blocked).toBe(true)
			expect(result.reason).toContain('Numeric IP')
		})

		it('blocks hex IP (0x7f000001)', () => {
			const result = isBlockedHost('0x7f000001')
			expect(result.blocked).toBe(true)
			expect(result.reason).toContain('Numeric IP')
		})

		it('blocks private IPv4 addresses', () => {
			expect(isBlockedHost('127.0.0.1').blocked).toBe(true)
			expect(isBlockedHost('10.0.0.1').blocked).toBe(true)
			expect(isBlockedHost('172.16.0.1').blocked).toBe(true)
			expect(isBlockedHost('192.168.1.1').blocked).toBe(true)
		})

		it('allows public IPv4 addresses', () => {
			expect(isBlockedHost('8.8.8.8').blocked).toBe(false)
			expect(isBlockedHost('93.184.216.34').blocked).toBe(false)
		})

		it('allows public 172.x addresses outside private range', () => {
			expect(isBlockedHost('172.32.0.1').blocked).toBe(false)
		})

		it('blocks IPv6 private addresses in brackets', () => {
			expect(isBlockedHost('[::1]').blocked).toBe(true)
			expect(isBlockedHost('[fe80::1]').blocked).toBe(true)
		})

		it('allows public hostnames', () => {
			expect(isBlockedHost('example.com').blocked).toBe(false)
			expect(isBlockedHost('api.github.com').blocked).toBe(false)
		})

		it('is case-insensitive', () => {
			expect(isBlockedHost('LOCALHOST').blocked).toBe(true)
			expect(isBlockedHost('Metadata.Google.Internal').blocked).toBe(true)
		})
	})

	describe('isUrlSafe', () => {
		it('allows normal HTTPS URLs', () => {
			expect(isUrlSafe('https://example.com/api').safe).toBe(true)
		})

		it('allows normal HTTP URLs', () => {
			expect(isUrlSafe('http://example.com/api').safe).toBe(true)
		})

		it('blocks private IPs', () => {
			expect(isUrlSafe('http://127.0.0.1/path').safe).toBe(false)
			expect(isUrlSafe('http://10.0.0.1/path').safe).toBe(false)
			expect(isUrlSafe('http://172.16.0.1/path').safe).toBe(false)
			expect(isUrlSafe('http://192.168.1.1/path').safe).toBe(false)
		})

		it('blocks decimal IP (2130706433)', () => {
			expect(isUrlSafe('http://2130706433/path').safe).toBe(false)
		})

		it('blocks hex IP (0x7f000001)', () => {
			expect(isUrlSafe('http://0x7f000001/path').safe).toBe(false)
		})

		it('blocks IPv4-mapped IPv6', () => {
			expect(isUrlSafe('http://[::ffff:127.0.0.1]/path').safe).toBe(false)
		})

		it('blocks non-HTTP protocols', () => {
			expect(isUrlSafe('ftp://example.com/file').safe).toBe(false)
			expect(isUrlSafe('file:///etc/passwd').safe).toBe(false)
			expect(isUrlSafe('gopher://evil.com/').safe).toBe(false)
		})

		it('blocks cloud metadata endpoint', () => {
			expect(isUrlSafe('http://169.254.169.254/latest/meta-data/').safe).toBe(false)
		})

		it('returns reason on failure', () => {
			const result = isUrlSafe('ftp://example.com')
			expect(result.safe).toBe(false)
			expect(result.reason).toBeDefined()
		})

		it('handles invalid URLs', () => {
			expect(isUrlSafe('not-a-url').safe).toBe(false)
			expect(isUrlSafe('').safe).toBe(false)
		})

		it('allows public URLs with paths and query strings', () => {
			expect(isUrlSafe('https://api.example.com/v1/data?key=val').safe).toBe(true)
		})
	})

	describe('isRedirectSafe', () => {
		it('allows safe redirect to public URL', () => {
			const result = isRedirectSafe({
				locationHeader: 'https://example.com/new-location',
				originalUrl: 'https://example.com/old',
			})
			expect(result.safe).toBe(true)
		})

		it('blocks redirect to private IP', () => {
			const result = isRedirectSafe({
				locationHeader: 'http://127.0.0.1/internal',
				originalUrl: 'https://example.com/start',
			})
			expect(result.safe).toBe(false)
		})

		it('blocks redirect to localhost', () => {
			const result = isRedirectSafe({
				locationHeader: 'http://localhost:3000/admin',
				originalUrl: 'https://example.com/start',
			})
			expect(result.safe).toBe(false)
		})

		it('resolves relative redirect URLs against original URL', () => {
			const result = isRedirectSafe({
				locationHeader: '/new-path',
				originalUrl: 'https://example.com/old-path',
			})
			expect(result.safe).toBe(true)
		})

		it('blocks redirect with missing Location header', () => {
			const result = isRedirectSafe({
				locationHeader: '',
				originalUrl: 'https://example.com/start',
			})
			expect(result.safe).toBe(false)
			expect(result.reason).toContain('Missing Location')
		})

		it('blocks redirect to decimal IP', () => {
			const result = isRedirectSafe({
				locationHeader: 'http://2130706433/steal',
				originalUrl: 'https://example.com/start',
			})
			expect(result.safe).toBe(false)
		})

		it('blocks redirect to IPv6 private address', () => {
			const result = isRedirectSafe({
				locationHeader: 'http://[::1]/internal',
				originalUrl: 'https://example.com/start',
			})
			expect(result.safe).toBe(false)
		})
	})

	describe('MAX_REDIRECT_HOPS', () => {
		it('is exported and is a reasonable value', () => {
			expect(MAX_REDIRECT_HOPS).toBe(5)
			expect(typeof MAX_REDIRECT_HOPS).toBe('number')
		})
	})
})
