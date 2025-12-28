'use client'

import { useEffect, useState } from 'react'

/** Default debounce delay in milliseconds */
const DEFAULT_DEBOUNCE_DELAY_MS = 500

/**
 * Hook that debounces a value
 * Returns the debounced value after the specified delay
 */
export function useDebouncedValue<T>(value: T, delay: number = DEFAULT_DEBOUNCE_DELAY_MS): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value)

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value)
		}, delay)

		return () => {
			clearTimeout(timer)
		}
	}, [value, delay])

	return debouncedValue
}

/**
 * Hook that returns a debounced callback
 * The callback will only execute after the specified delay has passed
 * without any new calls
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
	callback: T,
	delay: number = DEFAULT_DEBOUNCE_DELAY_MS,
): T {
	const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

	const debouncedCallback = ((...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId)
		}

		const newTimeoutId = setTimeout(() => {
			callback(...args)
		}, delay)

		setTimeoutId(newTimeoutId)
	}) as T

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId)
			}
		}
	}, [timeoutId])

	return debouncedCallback
}
