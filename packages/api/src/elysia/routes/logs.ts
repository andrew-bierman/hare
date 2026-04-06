/**
 * Log Routes
 *
 * Request logs and log statistics.
 */

import { Elysia } from 'elysia'
import { writePlugin } from '../context'

// =============================================================================
// Routes
// =============================================================================

export const logRoutes = new Elysia({ prefix: '/logs', name: 'log-routes' })
	.use(writePlugin)

	// List request logs
	.get('/', async ({ query }) => {
		// Placeholder until logging service is wired up
		const limit = Number(query?.limit) || 50
		const offset = Number(query?.offset) || 0

		return {
			logs: [],
			total: 0,
			limit,
			offset,
		}
	}, { writeAccess: true })

	// Get log statistics
	.get('/stats', async () => {
		// Placeholder until logging service is wired up
		return {
			totalRequests: 0,
			avgLatencyMs: 0,
			errorRate: 0,
			requestsByStatus: {},
			requestsByDay: [],
		}
	}, { writeAccess: true })
