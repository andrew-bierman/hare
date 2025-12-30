/**
 * hareai/tools - Complete tool exports
 *
 * This module provides access to all 59+ tools available in the Hare platform,
 * organized by category.
 *
 * @example
 * ```ts
 * import {
 *   // Tool utilities
 *   createTool,
 *   success,
 *   failure,
 *
 *   // Get tools by category
 *   getKVTools,
 *   getAITools,
 *   getSystemTools,
 *
 *   // Individual tools
 *   kvGetTool,
 *   summarizeTool,
 * } from 'hareai/tools'
 *
 * // Create a custom tool
 * const myTool = createTool({
 *   id: 'my_tool',
 *   description: 'Does something useful',
 *   inputSchema: z.object({ query: z.string() }),
 *   execute: async (params, ctx) => success({ result: 'done' })
 * })
 * ```
 *
 * @packageDocumentation
 */

// Re-export everything from @hare/tools
export * from '@hare/tools'
