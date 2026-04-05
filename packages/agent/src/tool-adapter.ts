import { tool as aiTool } from 'ai'
import type { ToolSet } from 'ai'
import type { Tool, ToolContext, ToolResult, HareEnv } from '@hare/tools'

/**
 * Convert Hare tools (Tool<TInput, TOutput>) to the Vercel AI SDK tool format
 * expected by streamText/generateText.
 *
 * AI SDK v6 tools are a Record<string, Tool> with `inputSchema` and `execute`.
 * Hare tools have a different type hierarchy (AnyTool for metadata, Tool for execution).
 * This adapter bridges them by closing over the ToolContext.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for heterogeneous Hare tool arrays
export function toAISDKTools(hareTools: Tool<any, any>[], context: ToolContext<HareEnv>): ToolSet {
	return Object.fromEntries(
		hareTools
			.filter((t) => typeof t.execute === 'function')
			.map((t) => [
				t.id,
				aiTool({
					description: t.description,
					inputSchema: t.inputSchema,
					execute: async (params) => {
						const result: ToolResult<unknown> = await t.execute(params, context)
						// AI SDK expects the raw return value, not ToolResult wrapper
						if (result.success) {
							return result.data
						}
						// Return error as an object for the model to see
						return { error: result.error ?? 'Tool execution failed' }
					},
				}),
			]),
	)
}
