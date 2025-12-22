import type { MiddlewareHandler } from 'hono'
import type { HonoEnv } from '../types'

interface TimingEntry {
	name: string
	duration: number
	description?: string
}

/**
 * Timing middleware for Server-Timing performance headers.
 * Tracks request processing time and adds Server-Timing header for browser DevTools.
 */
export function timing(): MiddlewareHandler<HonoEnv> {
	return async (c, next) => {
		const start = performance.now()
		const timings: TimingEntry[] = []

		// Add helper to context for adding custom timings
		c.set('addTiming', (name: string, duration: number, description?: string) => {
			timings.push({ name, duration, description })
		})

		await next()

		const end = performance.now()
		const totalDuration = end - start

		// Add total duration
		timings.push({
			name: 'total',
			duration: totalDuration,
			description: 'Total request time',
		})

		// Format Server-Timing header
		// Format: name;dur=duration;desc="description"
		const serverTimingValue = timings
			.map((timing) => {
				let value = `${timing.name};dur=${timing.duration.toFixed(2)}`
				if (timing.description) {
					value += `;desc="${timing.description}"`
				}
				return value
			})
			.join(', ')

		c.header('Server-Timing', serverTimingValue)
	}
}

/**
 * Helper to measure and add timing for a specific operation.
 * Usage: const result = await measureTiming(c, 'db-query', () => db.query(...))
 */
export async function measureTiming<T>(
	c: Parameters<MiddlewareHandler>[0],
	name: string,
	operation: () => Promise<T>,
	description?: string,
): Promise<T> {
	const start = performance.now()
	try {
		return await operation()
	} finally {
		const end = performance.now()
		const duration = end - start
		const addTiming = c.get('addTiming')
		if (addTiming && typeof addTiming === 'function') {
			addTiming(name, duration, description)
		}
	}
}
