/**
 * Agent Control Deployment Tools
 *
 * Tools for deploying, undeploying, and rolling back agents.
 */

import { getErrorMessage } from '@hare/checks'
import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from '../types'
import {
	DeployAgentOutputSchema,
	RollbackAgentOutputSchema,
	UndeployAgentOutputSchema,
} from './schemas'
import { hasAgentControlCapabilities } from './types'

/**
 * Deploy an agent (set status to 'deployed')
 */
export const deployAgentTool = createTool({
	id: 'agent_deploy',
	description: 'Deploy an agent, making it active and accessible for conversations',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to deploy'),
	}),
	outputSchema: DeployAgentOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			const existing = await db
				.prepare('SELECT id, status FROM agents WHERE id = ? AND workspaceId = ?')
				.bind(params.agentId, workspaceId)
				.first()

			if (!existing) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			if (existing.status === 'deployed') {
				return failure('Agent is already deployed')
			}

			const now = Date.now()
			await db
				.prepare('UPDATE agents SET status = ?, updatedAt = ? WHERE id = ? AND workspaceId = ?')
				.bind('deployed', now, params.agentId, workspaceId)
				.run()

			return success({
				agentId: params.agentId,
				status: 'deployed',
				previousStatus: existing.status as string,
				deployedAt: now,
			})
		} catch (error) {
			return failure(getErrorMessage(error))
		}
	},
})

/**
 * Undeploy an agent (set status to 'draft')
 */
export const undeployAgentTool = createTool({
	id: 'agent_undeploy',
	description: 'Undeploy an agent, stopping it from receiving new conversations',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to undeploy'),
	}),
	outputSchema: UndeployAgentOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			const existing = await db
				.prepare('SELECT id, status FROM agents WHERE id = ? AND workspaceId = ?')
				.bind(params.agentId, workspaceId)
				.first()

			if (!existing) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			if (existing.status !== 'deployed') {
				return failure(`Agent is not deployed. Current status: ${existing.status}`)
			}

			const now = Date.now()
			await db
				.prepare('UPDATE agents SET status = ?, updatedAt = ? WHERE id = ? AND workspaceId = ?')
				.bind('draft', now, params.agentId, workspaceId)
				.run()

			return success({
				agentId: params.agentId,
				status: 'draft',
				previousStatus: existing.status as string,
				undeployedAt: now,
			})
		} catch (error) {
			return failure(getErrorMessage(error))
		}
	},
})

/**
 * Rollback an agent to a previous configuration snapshot
 */
export const rollbackAgentTool = createTool({
	id: 'agent_rollback',
	description: 'Rollback an agent to a previous configuration by restoring a snapshot',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to rollback'),
		snapshotId: z
			.string()
			.optional()
			.describe('Specific snapshot ID to rollback to (defaults to most recent)'),
	}),
	outputSchema: RollbackAgentOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Verify agent exists
			const existing = await db
				.prepare(
					'SELECT id, config, instructions, model FROM agents WHERE id = ? AND workspaceId = ?',
				)
				.bind(params.agentId, workspaceId)
				.first()

			if (!existing) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			// Get the snapshot to rollback to
			let snapshotQuery: string
			let snapshotBindings: unknown[]

			if (params.snapshotId) {
				snapshotQuery =
					'SELECT id, config, instructions, model, createdAt FROM agent_snapshots WHERE id = ? AND agentId = ?'
				snapshotBindings = [params.snapshotId, params.agentId]
			} else {
				snapshotQuery =
					'SELECT id, config, instructions, model, createdAt FROM agent_snapshots WHERE agentId = ? ORDER BY createdAt DESC LIMIT 1'
				snapshotBindings = [params.agentId]
			}

			const snapshot = await db
				.prepare(snapshotQuery)
				.bind(...snapshotBindings)
				.first()

			if (!snapshot) {
				return failure('No snapshot found to rollback to')
			}

			const now = Date.now()

			// Save current state as a new snapshot before rollback
			await db
				.prepare(
					'INSERT INTO agent_snapshots (id, agentId, config, instructions, model, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
				)
				.bind(
					`snap_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
					params.agentId,
					existing.config,
					existing.instructions,
					existing.model,
					now,
				)
				.run()

			// Restore the snapshot
			await db
				.prepare(
					'UPDATE agents SET config = ?, instructions = ?, model = ?, updatedAt = ? WHERE id = ? AND workspaceId = ?',
				)
				.bind(
					snapshot.config,
					snapshot.instructions,
					snapshot.model,
					now,
					params.agentId,
					workspaceId,
				)
				.run()

			return success({
				agentId: params.agentId,
				rolledBackTo: snapshot.id as string,
				previousConfig: existing.config ? JSON.parse(existing.config as string) : null,
				restoredConfig: snapshot.config ? JSON.parse(snapshot.config as string) : null,
				rolledBackAt: now,
			})
		} catch (error) {
			return failure(getErrorMessage(error))
		}
	},
})
