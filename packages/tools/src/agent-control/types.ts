/**
 * Agent Control Types
 *
 * Shared types and utilities for agent control tools.
 */

import type { z } from 'zod'
import type { HareEnv, ToolContext, ToolResult } from '../types'

/**
 * Extended environment for agent control tools.
 * Requires database and optional Durable Object bindings.
 */
export interface AgentControlEnv extends HareEnv {
	/** D1 database - required for agent queries */
	DB: D1Database
	/** HareAgent Durable Object namespace - required for agent operations */
	HARE_AGENT?: DurableObjectNamespace
}

/**
 * Extended context for agent control tools.
 * Provides access to database for real implementations.
 */
export interface AgentControlContext extends ToolContext<AgentControlEnv> {
	env: AgentControlEnv
}

/**
 * Check if context has agent control capabilities
 */
export function hasAgentControlCapabilities(context: ToolContext): context is AgentControlContext {
	return context.env && 'DB' in context.env && context.env.DB !== undefined
}

/**
 * Executable tool type that includes the execute method.
 * Use this when you need to call execute() on tools.
 */
export type ExecutableTool = {
	id: string
	description: string
	inputSchema: z.ZodTypeAny
	outputSchema: z.ZodTypeAny
	// biome-ignore lint/suspicious/noExplicitAny: Required for heterogeneous tool collections
	execute: (params: any, context: ToolContext) => Promise<ToolResult<any>>
}
