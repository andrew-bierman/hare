/**
 * Mock for @paralleldrive/cuid2
 *
 * cuid2 calls crypto.getRandomValues() at import time, which fails in
 * Cloudflare Workers global scope during tests. This mock provides
 * deterministic IDs for testing.
 */

let counter = 0

export function createId(): string {
	counter++
	return `test_cuid_${counter.toString().padStart(8, '0')}`
}

export function init() {
	return createId
}

export function isCuid(id: string): boolean {
	return typeof id === 'string' && id.length > 0
}

// Reset counter for test isolation
export function __resetCounter(): void {
	counter = 0
}
