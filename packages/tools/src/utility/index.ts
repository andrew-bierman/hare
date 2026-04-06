import type { ToolContext } from '../types'
import { datetimeTool } from './datetime'
import { delayTool } from './delay'
import { base64Tool, hashTool, urlTool, uuidTool } from './encoding'
import { jsonTool } from './json'
import { mathTool } from './math'
import { textTool } from './text'

// Re-export all tools
export { datetimeTool } from './datetime'
export { delayTool } from './delay'
export { base64Tool, hashTool, urlTool, uuidTool } from './encoding'
export { jsonTool } from './json'
export { mathTool } from './math'
// Re-export all schemas
export * from './schemas'
export { textTool } from './text'

/**
 * Get all utility tools.
 */
export function getUtilityTools(_context: ToolContext) {
	return [
		datetimeTool,
		jsonTool,
		textTool,
		mathTool,
		uuidTool,
		hashTool,
		base64Tool,
		urlTool,
		delayTool,
	]
}
