'use client'

import { encode } from 'gpt-tokenizer'
import { useEffect, useMemo, useState } from 'react'

export interface TokenCountResult {
	tokens: number
	characters: number
	words: number
	lines: number
	isLoading: boolean
}

export function useTokenCount(text: string, debounceMs = 300): TokenCountResult {
	const [tokens, setTokens] = useState(0)
	const [isLoading, setIsLoading] = useState(false)

	// Synchronous calculations
	const stats = useMemo(
		() => ({
			characters: text.length,
			words: text.trim() ? text.trim().split(/\s+/).length : 0,
			lines: text.split('\n').length,
		}),
		[text],
	)

	// Debounced token counting (expensive operation)
	useEffect(() => {
		setIsLoading(true)
		const timer = setTimeout(() => {
			try {
				const encoded = encode(text)
				setTokens(encoded.length)
			} catch {
				setTokens(0)
			}
			setIsLoading(false)
		}, debounceMs)
		return () => clearTimeout(timer)
	}, [text, debounceMs])

	return { tokens, isLoading, ...stats }
}
