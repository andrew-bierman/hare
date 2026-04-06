/**
 * @hare/checks — Type guard utilities
 *
 * Replace raw `typeof` and `instanceof` checks with these type-safe guards.
 * This provides a single place to manage type narrowing across the codebase.
 *
 * @example
 * ```ts
 * import { isError, isString, isRecord } from '@hare/checks'
 *
 * // Instead of: error instanceof Error
 * if (isError(error)) { logger.error(error.message) }
 *
 * // Instead of: typeof value === 'string'
 * if (isString(value)) { process(value) }
 * ```
 */

// =============================================================================
// Primitive type guards
// =============================================================================

export function isString(value: unknown): value is string {
	return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
	return typeof value === 'number' && !Number.isNaN(value)
}

export function isBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean'
}

export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
	return typeof value === 'function'
}

export function isUndefined(value: unknown): value is undefined {
	return value === undefined
}

export function isNull(value: unknown): value is null {
	return value === null
}

export function isNullish(value: unknown): value is null | undefined {
	return value == null
}

export function isDefined<T>(value: T | null | undefined): value is T {
	return value != null
}

// =============================================================================
// Object type guards
// =============================================================================

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value)
}

export function isError(value: unknown): value is Error {
	return value instanceof Error
}

export function isDate(value: unknown): value is Date {
	return value instanceof Date
}

export function isRegExp(value: unknown): value is RegExp {
	return value instanceof RegExp
}

export function isPromise(value: unknown): value is Promise<unknown> {
	return value instanceof Promise || (isRecord(value) && isFunction(value.then))
}

// =============================================================================
// Compound type guards
// =============================================================================

export function isNonEmptyString(value: unknown): value is string {
	return isString(value) && value.length > 0
}

export function isPositiveNumber(value: unknown): value is number {
	return isNumber(value) && value > 0
}

export function isNonNegativeNumber(value: unknown): value is number {
	return isNumber(value) && value >= 0
}

export function isIntegerNumber(value: unknown): value is number {
	return isNumber(value) && Number.isInteger(value)
}

// =============================================================================
// Error message extraction
// =============================================================================

/**
 * Safely extract an error message from an unknown caught value.
 * Replaces the common pattern: `error instanceof Error ? error.message : 'Unknown error'`
 */
export function getErrorMessage(error: unknown): string {
	if (isError(error)) return error.message
	if (isString(error)) return error
	return 'Unknown error'
}

/**
 * Check if an error is an AbortError (from AbortController timeouts).
 * Replaces: `error instanceof Error && error.name === 'AbortError'`
 */
export function isAbortError(error: unknown): boolean {
	return isError(error) && error.name === 'AbortError'
}

/**
 * Check if an error is an instance of a specific error class.
 * Replaces: `error instanceof SyntaxError`
 */
export function isErrorType<T extends new (...args: never[]) => Error>(
	error: unknown,
	ErrorClass: T,
): error is InstanceType<T> {
	return error instanceof ErrorClass
}

/**
 * Safely extract an error message with a fallback prefix.
 * Replaces: `\`Failed: ${error instanceof Error ? error.message : 'Unknown'}\``
 */
export function formatError(prefix: string, error: unknown): string {
	return `${prefix}: ${getErrorMessage(error)}`
}
