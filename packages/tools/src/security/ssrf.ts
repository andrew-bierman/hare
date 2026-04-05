/**
 * Consolidated SSRF (Server-Side Request Forgery) Protection
 *
 * Single source of truth for URL validation used by:
 * - HTTP tool (packages/tools/src/http.ts)
 * - Webhook service (packages/api/src/services/webhooks.ts)
 * - Browser tool (future)
 *
 * Blocks:
 * - Private IP ranges (localhost, 127.x, 10.x, 172.16-31.x, 192.168.x)
 * - Cloud metadata endpoints (169.254.169.254)
 * - Internal hostnames (.internal, .local, .localhost)
 * - Decimal/hex/octal IP encodings (2130706433 = 127.0.0.1, 0x7f000001)
 * - IPv6 private ranges (::1, fe80::, fc00::, fd00::)
 * - IPv4-mapped IPv6 (::ffff:127.0.0.1, ::ffff:7f00:1)
 * - Non-HTTP protocols
 */

// =============================================================================
// Constants
// =============================================================================

/** Blocked hostnames (exact match) */
const BLOCKED_HOSTNAMES = new Set([
	'localhost',
	'localhost.localdomain',
	'metadata.google.internal',
])

/** Blocked hostname suffixes (for subdomains) */
const BLOCKED_HOSTNAME_SUFFIXES = ['.internal', '.local', '.localhost']

/** Maximum number of redirect hops to follow */
export const MAX_REDIRECT_HOPS = 5

// =============================================================================
// IPv4 Parsing and Validation
// =============================================================================

/**
 * Parse a standard dotted-decimal IPv4 address into its numeric octets.
 * Returns null if not a valid IPv4 in strict dotted-decimal form.
 */
export function parseIPv4(ip: string): number[] | null {
	const parts = ip.split('.')
	if (parts.length !== 4) return null
	const octets: number[] = []
	for (const part of parts) {
		const num = Number.parseInt(part, 10)
		if (Number.isNaN(num) || num < 0 || num > 255 || part !== num.toString()) {
			return null
		}
		octets.push(num)
	}
	return octets
}

/**
 * Check if an IPv4 address (as octets) is in a private/blocked range.
 */
export function isPrivateIPv4(octets: number[]): boolean {
	if (octets.length < 2) return false
	const a = octets[0]!
	const b = octets[1]!

	// 0.0.0.0/8 - Current network
	if (a === 0) return true
	// 10.0.0.0/8 - Private Class A
	if (a === 10) return true
	// 127.0.0.0/8 - Loopback
	if (a === 127) return true
	// 169.254.0.0/16 - Link-local (cloud metadata)
	if (a === 169 && b === 254) return true
	// 172.16.0.0/12 - Private Class B (172.16.0.0 - 172.31.255.255)
	if (a === 172 && b >= 16 && b <= 31) return true
	// 192.168.0.0/16 - Private Class C
	if (a === 192 && b === 168) return true
	// 224.0.0.0/4 - Multicast
	if (a >= 224 && a <= 239) return true
	// 240.0.0.0/4 - Reserved
	if (a >= 240) return true

	return false
}

// =============================================================================
// IPv6 Validation
// =============================================================================

/**
 * Check if an IPv6 address is in a private/blocked range.
 */
export function isPrivateIPv6(hostname: string): boolean {
	const normalized = hostname.toLowerCase()

	// Loopback ::1
	if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true
	// Unspecified ::
	if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true
	// Link-local fe80::/10
	if (
		normalized.startsWith('fe8') ||
		normalized.startsWith('fe9') ||
		normalized.startsWith('fea') ||
		normalized.startsWith('feb')
	)
		return true
	// Unique local fc00::/7 (includes fd00::/8)
	if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true

	// IPv4-mapped ::ffff:x.x.x.x or ::ffff:7f00:1
	if (normalized.startsWith('::ffff:')) {
		const mapped = normalized.slice(7)
		// Try dot-decimal form first (::ffff:127.0.0.1)
		const octets = parseIPv4(mapped)
		if (octets && isPrivateIPv4(octets)) return true
		// Handle hex-word form (::ffff:7f00:1) — convert to IPv4 octets
		const hexParts = mapped.split(':')
		if (hexParts.length === 2 && hexParts[0] && hexParts[1]) {
			const hi = Number.parseInt(hexParts[0], 16)
			const lo = Number.parseInt(hexParts[1], 16)
			if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
				const ipv4Octets = [(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff]
				if (isPrivateIPv4(ipv4Octets)) return true
			}
		}
	}

	return false
}

// =============================================================================
// Host Validation
// =============================================================================

export interface BlockedResult {
	blocked: boolean
	reason?: string
}

/**
 * Check if a hostname is a blocked/private address.
 *
 * Covers:
 * - Exact hostname blocklist
 * - Suffix blocklist (.internal, .local, .localhost)
 * - Decimal IP encoding (e.g., http://2130706433 = 127.0.0.1)
 * - Hex IP encoding (e.g., http://0x7f000001 = 127.0.0.1)
 * - Standard dotted-decimal IPv4 private ranges
 * - IPv6 private ranges
 */
export function isBlockedHost(hostname: string): BlockedResult {
	const lower = hostname.toLowerCase()

	// Exact hostname blocklist
	if (BLOCKED_HOSTNAMES.has(lower)) {
		return { blocked: true, reason: 'Blocked hostname' }
	}

	// Suffix blocklist
	for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
		if (lower.endsWith(suffix)) {
			return { blocked: true, reason: 'Internal network hostname suffix' }
		}
	}

	// Block decimal IP representations (e.g., 2130706433 = 127.0.0.1)
	if (/^\d+$/.test(lower)) {
		return { blocked: true, reason: 'Numeric IP representations are not allowed' }
	}

	// Block hex IP representations (e.g., 0x7f000001 = 127.0.0.1)
	if (lower.startsWith('0x')) {
		return { blocked: true, reason: 'Numeric IP representations are not allowed' }
	}

	// Block dotted-quad hostnames with leading-zero octets (e.g., 0127.0.0.1)
	// These bypass parseIPv4 (which requires canonical form) but may be resolved
	// by DNS or HTTP libraries using octal interpretation.
	if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lower) && /(?:^|\.)0\d/.test(lower)) {
		return { blocked: true, reason: 'Leading-zero octets in IP address are not allowed' }
	}

	// Check if it's a standard dotted-decimal IPv4 address
	const ipv4Octets = parseIPv4(lower)
	if (ipv4Octets) {
		if (isPrivateIPv4(ipv4Octets)) {
			return { blocked: true, reason: 'Private/internal IPv4 address' }
		}
		return { blocked: false }
	}

	// Check if it's an IPv6 address (may be in brackets for URLs)
	const ipv6 = lower.startsWith('[') && lower.endsWith(']') ? lower.slice(1, -1) : lower
	if (ipv6.includes(':')) {
		if (isPrivateIPv6(ipv6)) {
			return { blocked: true, reason: 'Private/internal IPv6 address' }
		}
	}

	return { blocked: false }
}

// =============================================================================
// URL Validation
// =============================================================================

export interface UrlSafetyResult {
	safe: boolean
	reason?: string
}

/**
 * Check if a URL is safe to call (SSRF protection).
 *
 * Validates:
 * - Protocol (only http: and https: allowed)
 * - Hostname against blocklist, private ranges, numeric encodings
 * - Cloud metadata endpoint (169.254.169.254)
 */
export function isUrlSafe(url: string): UrlSafetyResult {
	try {
		const parsed = new URL(url)

		// Only allow http and https
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			return { safe: false, reason: 'Only HTTP and HTTPS protocols are allowed' }
		}

		// Check blocked hosts (includes decimal/hex IP protection)
		const hostCheck = isBlockedHost(parsed.hostname)
		if (hostCheck.blocked) {
			return { safe: false, reason: hostCheck.reason }
		}

		// Additional cloud metadata endpoint check (dotted-decimal form)
		if (parsed.hostname === '169.254.169.254') {
			return { safe: false, reason: 'Cloud metadata endpoint not allowed' }
		}

		return { safe: true }
	} catch {
		return { safe: false, reason: 'Invalid URL format' }
	}
}

/**
 * Validate a redirect URL for SSRF safety.
 * Used when following redirects manually with redirect: 'manual'.
 *
 * @param locationHeader - The Location header from a redirect response
 * @param originalUrl - The original request URL (for resolving relative redirects)
 * @returns Safety result
 */
export function isRedirectSafe(options: {
	locationHeader: string
	originalUrl: string
}): UrlSafetyResult {
	const { locationHeader, originalUrl } = options

	if (!locationHeader) {
		return { safe: false, reason: 'Missing Location header in redirect' }
	}

	// Resolve relative URLs against the original URL
	let redirectUrl: string
	try {
		redirectUrl = new URL(locationHeader, originalUrl).toString()
	} catch {
		return { safe: false, reason: 'Invalid redirect URL' }
	}

	return isUrlSafe(redirectUrl)
}
