/**
 * SSRF (Server-Side Request Forgery) Protection
 *
 * Shared module for URL validation across HTTP tools, webhooks, and browser tools.
 * Consolidates protections from packages/tools/src/http.ts and
 * packages/api/src/services/webhooks.ts into a single source of truth.
 */

// ============================================================================
// Types
// ============================================================================

export interface UrlSafetyResult {
	safe: boolean
	reason?: string
}

// ============================================================================
// Constants
// ============================================================================

const BLOCKED_HOSTNAMES = new Set([
	'localhost',
	'localhost.localdomain',
	'metadata.google.internal',
	'metadata.google',
	'metadata',
	'kubernetes.default.svc',
])

const BLOCKED_HOSTNAME_SUFFIXES = ['.internal', '.local', '.localhost']

/** Protocols allowed for HTTP requests */
const ALLOWED_HTTP_PROTOCOLS = new Set(['http:', 'https:'])

/** Protocols forbidden for browser navigation */
const DANGEROUS_PROTOCOLS = new Set([
	'file:',
	'javascript:',
	'data:',
	'blob:',
	'chrome:',
	'chrome-extension:',
	'about:',
	'view-source:',
	'vbscript:',
	'ftp:',
	'gopher:',
])

// ============================================================================
// IPv4 Parsing and Validation
// ============================================================================

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

export function isPrivateIPv4(octets: number[]): boolean {
	if (octets.length < 2) return false
	const a = octets[0]!
	const b = octets[1]!

	if (a === 0) return true // 0.0.0.0/8 - Current network
	if (a === 10) return true // 10.0.0.0/8 - Private
	if (a === 127) return true // 127.0.0.0/8 - Loopback
	if (a === 169 && b === 254) return true // 169.254.0.0/16 - Link-local / cloud metadata
	if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12 - Private
	if (a === 192 && b === 168) return true // 192.168.0.0/16 - Private
	if (a >= 224) return true // 224.0.0.0+ - Multicast + Reserved

	return false
}

// ============================================================================
// IPv6 Validation
// ============================================================================

export function isPrivateIPv6(hostname: string): boolean {
	const norm = hostname.toLowerCase()

	if (norm === '::1' || norm === '0:0:0:0:0:0:0:1') return true // Loopback
	if (norm === '::' || norm === '0:0:0:0:0:0:0:0') return true // Unspecified
	if (/^fe[89ab]/.test(norm)) return true // Link-local fe80::/10
	if (norm.startsWith('fc') || norm.startsWith('fd')) return true // Unique local fc00::/7

	// IPv4-mapped ::ffff:x.x.x.x or ::ffff:7f00:1
	if (norm.startsWith('::ffff:')) {
		const mapped = norm.slice(7)

		// Dot-decimal form (::ffff:127.0.0.1)
		const octets = parseIPv4(mapped)
		if (octets && isPrivateIPv4(octets)) return true

		// Hex-word form (::ffff:7f00:1)
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

// ============================================================================
// Numeric IP Bypass Prevention
// ============================================================================

function isNumericHostBypass(hostname: string): boolean {
	// Decimal IP (e.g., 2130706433 = 127.0.0.1)
	if (/^\d+$/.test(hostname)) return true

	// Hex IP (e.g., 0x7f000001 = 127.0.0.1)
	if (hostname.startsWith('0x')) return true

	// Octal notation (e.g., 0177.0.0.1 = 127.0.0.1)
	if (/^0\d/.test(hostname)) return true

	return false
}

// ============================================================================
// Core Hostname Validation
// ============================================================================

export function isBlockedHost(hostname: string): { blocked: boolean; reason?: string } {
	const lower = hostname.toLowerCase()

	// Numeric IP bypass (decimal/hex/octal)
	if (isNumericHostBypass(lower)) {
		return { blocked: true, reason: 'Numeric IP encoding not allowed' }
	}

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

	// IPv4
	const ipv4Octets = parseIPv4(lower)
	if (ipv4Octets) {
		if (isPrivateIPv4(ipv4Octets)) {
			return { blocked: true, reason: 'Private/internal IPv4 address' }
		}
		return { blocked: false }
	}

	// IPv6 (may be in brackets)
	const ipv6 = lower.startsWith('[') && lower.endsWith(']') ? lower.slice(1, -1) : lower
	if (ipv6.includes(':')) {
		if (isPrivateIPv6(ipv6)) {
			return { blocked: true, reason: 'Private/internal IPv6 address' }
		}
	}

	return { blocked: false }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Validate a URL for safe HTTP fetching.
 * Blocks private IPs, cloud metadata, numeric IP bypasses, and non-HTTP protocols.
 */
export function isUrlSafe(url: string): UrlSafetyResult {
	try {
		const parsed = new URL(url)
		if (!ALLOWED_HTTP_PROTOCOLS.has(parsed.protocol)) {
			return { safe: false, reason: `Protocol '${parsed.protocol}' not allowed` }
		}
		const hostCheck = isBlockedHost(parsed.hostname)
		if (hostCheck.blocked) {
			return { safe: false, reason: hostCheck.reason }
		}
		return { safe: true }
	} catch {
		return { safe: false, reason: 'Invalid URL format' }
	}
}

/**
 * Validate a URL for browser navigation (stricter than HTTP).
 * Additionally blocks dangerous protocols (file://, javascript://, data://, etc.)
 */
export function isBrowserUrlSafe(url: string): UrlSafetyResult {
	const lowerUrl = url.toLowerCase().trim()
	for (const proto of DANGEROUS_PROTOCOLS) {
		if (lowerUrl.startsWith(proto)) {
			return { safe: false, reason: `Protocol '${proto}' is forbidden for browser navigation` }
		}
	}
	return isUrlSafe(url)
}

// ============================================================================
// Redirect Safety
// ============================================================================

export const MAX_REDIRECT_HOPS = 5

/**
 * Check if a redirect URL is safe to follow.
 * Resolves relative redirects against the original URL.
 */
export function isRedirectSafe(options: {
	locationHeader: string
	originalUrl: string
	currentHop?: number
}): UrlSafetyResult {
	const { locationHeader, originalUrl, currentHop = 0 } = options
	if (!locationHeader) {
		return { safe: false, reason: 'Missing Location header in redirect' }
	}
	if (currentHop >= MAX_REDIRECT_HOPS) {
		return { safe: false, reason: `Too many redirects (max ${MAX_REDIRECT_HOPS})` }
	}
	// Resolve relative URLs against the original
	try {
		const resolvedUrl = new URL(locationHeader, originalUrl).toString()
		return isUrlSafe(resolvedUrl)
	} catch {
		return { safe: false, reason: 'Invalid redirect URL' }
	}
}
