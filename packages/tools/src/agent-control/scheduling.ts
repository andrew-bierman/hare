/**
 * Agent Control Scheduling Tools
 *
 * Tools for scheduling tasks for agents.
 */

import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from '../types'
import { ScheduleTaskOutputSchema } from './schemas'
import { hasAgentControlCapabilities } from './types'

/**
 * Schedule a task for an agent
 */
export const scheduleTaskTool = createTool({
	id: 'agent_schedule',
	description: 'Schedule a task for an agent to execute at a specific time or on a schedule',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to schedule the task for'),
		action: z.string().describe('The action to perform'),
		executeAt: z.number().optional().describe('Unix timestamp to execute at'),
		cron: z.string().optional().describe('Cron expression for recurring tasks'),
		payload: z.record(z.string(), z.unknown()).optional().describe('Task payload'),
	}),
	outputSchema: ScheduleTaskOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			if (!params.executeAt && !params.cron) {
				return failure('Either executeAt or cron must be provided')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId
			const userId = context.userId

			// Verify agent exists
			const existing = await db
				.prepare(
					`
					SELECT id FROM agents WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(params.agentId, workspaceId)
				.first()

			if (!existing) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			// Generate task ID
			const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
			const now = Date.now()
			const taskType = params.cron ? 'recurring' : 'one-time'

			// Calculate next execution time
			let nextExecuteAt: number | null = null
			if (params.executeAt) {
				if (params.executeAt <= now) {
					return failure('executeAt must be in the future')
				}
				nextExecuteAt = params.executeAt
			}

			// Insert the scheduled task
			await db
				.prepare(
					`
					INSERT INTO scheduled_tasks (id, agentId, type, action, executeAt, cron, payload, status, nextExecuteAt, createdBy, createdAt, updatedAt)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				)
				.bind(
					taskId,
					params.agentId,
					taskType,
					params.action,
					params.executeAt || null,
					params.cron || null,
					params.payload ? JSON.stringify(params.payload) : null,
					'pending',
					nextExecuteAt,
					userId,
					now,
					now,
				)
				.run()

			// If Durable Object is available, schedule the task there too for execution
			const hareAgent = context.env.HARE_AGENT
			if (hareAgent) {
				try {
					const id = hareAgent.idFromName(params.agentId)
					const stub = hareAgent.get(id)

					// Send schedule request to the Durable Object via HTTP
					const doResponse = await stub.fetch(
						new Request('http://internal/schedule', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								action: params.action,
								executeAt: params.executeAt,
								cron: params.cron,
								payload: params.payload,
							}),
						}),
					)
					if (!doResponse.ok) {
						console.warn(
							`[agent_schedule] DO scheduling failed for agent ${params.agentId}: ${await doResponse.text()}`,
						)
					}
				} catch (error) {
					// DO scheduling is optional - database record is still created
					console.warn(
						`[agent_schedule] DO scheduling error for agent ${params.agentId}:`,
						error instanceof Error ? error.message : error,
					)
				}
			}

			return success({
				id: taskId,
				agentId: params.agentId,
				action: params.action,
				type: taskType,
				executeAt: params.executeAt,
				cron: params.cron,
				payload: params.payload,
				status: 'pending',
				createdAt: now,
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to schedule task')
		}
	},
})
