/**
 * Type-Safe Tool Delegation
 *
 * Utilities for safely calling one tool from another tool's execute function.
 * This ensures type safety is maintained when tools delegate to other tools.
 */

import type { HareEnv, Tool, ToolContext, ToolResult } from './types'

/**
 * Type-safe tool delegation.
 *
 * Use this when one tool needs to call another tool internally with
 * known, typed parameters. The input is already typed so no validation
 * is performed.
 *
 * @example
 * ```ts
 * // In httpGetTool's execute:
 * execute: async (params, context) => {
 *   return delegateTo(httpRequestTool, { ...params, method: 'GET' }, context)
 * }
 * ```
 */
export async function delegateTo<TInput, TOutput>(
	tool: Tool<TInput, TOutput>,
	params: TInput,
	context: ToolContext<HareEnv>,
): Promise<ToolResult<TOutput>> {
	return tool.execute(params, context)
}

/**
 * Type-safe delegation with input schema validation.
 *
 * Use when params come from an untrusted source or when you want
 * to ensure validation even for internal calls.
 *
 * @example
 * ```ts
 * // When delegating with potentially untrusted params:
 * execute: async (params, context) => {
 *   return delegateToWithValidation(httpRequestTool, params, context)
 * }
 * ```
 */
export async function delegateToWithValidation<TInput, TOutput>(
	tool: Tool<TInput, TOutput>,
	params: unknown,
	context: ToolContext<HareEnv>,
): Promise<ToolResult<TOutput>> {
	const parseResult = tool.inputSchema.safeParse(params)
	if (!parseResult.success) {
		return {
			success: false,
			error: `Input validation failed: ${parseResult.error.message}`,
		}
	}
	return tool.execute(parseResult.data, context)
}
