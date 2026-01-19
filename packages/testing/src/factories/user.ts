/**
 * User factory for creating test user data.
 */

import { createId } from '@hare/db'

/**
 * User data shape matching the database schema.
 */
export interface TestUser {
	id: string
	name: string
	email: string
	emailVerified: boolean
	image: string | null
	createdAt: Date
	updatedAt: Date
}

/**
 * Optional overrides for creating a test user.
 */
export type TestUserOverrides = Partial<TestUser>

let userCounter = 0

/**
 * Creates a test user with sensible defaults.
 * All fields can be overridden for specific test scenarios.
 *
 * @example
 * ```ts
 * // Create a user with all defaults
 * const user = createTestUser()
 *
 * // Create a user with custom email
 * const adminUser = createTestUser({ email: 'admin@test.com', name: 'Admin User' })
 *
 * // Create a verified user
 * const verifiedUser = createTestUser({ emailVerified: true })
 * ```
 */
export function createTestUser(overrides: TestUserOverrides = {}): TestUser {
	userCounter++
	const now = new Date()

	return {
		id: overrides.id ?? createId(),
		name: overrides.name ?? `Test User ${userCounter}`,
		email: overrides.email ?? `testuser${userCounter}@example.com`,
		emailVerified: overrides.emailVerified ?? false,
		image: overrides.image ?? null,
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	}
}

/**
 * Creates multiple test users at once.
 *
 * @example
 * ```ts
 * const users = createTestUsers(5)
 * const verifiedUsers = createTestUsers(3, { emailVerified: true })
 * ```
 */
export function createTestUsers(
	count: number,
	overrides: TestUserOverrides = {},
): TestUser[] {
	return Array.from({ length: count }, () => createTestUser(overrides))
}

/**
 * Reset the user counter. Useful for test isolation.
 */
export function __resetUserCounter(): void {
	userCounter = 0
}
