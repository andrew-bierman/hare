/**
 * Approximate characters per token for rough token estimation.
 * Based on the common heuristic that ~4 characters ≈ 1 token for English text.
 */
const CHARS_PER_TOKEN = 4

/**
 * Estimate the number of tokens in a text string.
 * This is a rough approximation — use a proper tokenizer for accuracy.
 */
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / CHARS_PER_TOKEN)
}
