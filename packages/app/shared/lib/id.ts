/**
 * ID Generation Utilities
 *
 * Provides consistent, collision-resistant ID generation using cuid2.
 */

import { createId } from '@paralleldrive/cuid2'

/**
 * Generate a unique ID for use in the application.
 * Uses cuid2 for collision-resistant, sortable IDs.
 */
export function generateId(): string {
	return createId()
}

/**
 * Generate a prefixed ID for categorized entities.
 * @param prefix - Prefix to add (e.g., 'user', 'msg', 'field')
 */
export function generatePrefixedId(prefix: string): string {
	return `${prefix}-${createId()}`
}
