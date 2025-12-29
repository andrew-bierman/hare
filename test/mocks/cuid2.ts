/**
 * Mock implementation of @paralleldrive/cuid2 for Cloudflare Workers test environment.
 *
 * The real cuid2 library initializes its random pool at import time using
 * crypto.getRandomValues(), which is not allowed in CF Workers global scope.
 * This mock provides deterministic IDs for testing.
 */

let counter = 0

export function createId(): string {
	return `test-${++counter}`
}

export function init(): () => string {
	return createId
}

export function isCuid(id: string): boolean {
	return typeof id === 'string' && id.length > 0
}

// Reset counter for test isolation (can be called in beforeEach)
export function resetIdCounter(): void {
	counter = 0
}
