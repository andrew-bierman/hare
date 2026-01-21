/**
 * Database seeding utilities for integration tests.
 *
 * These utilities help set up complete test scenarios with
 * related entities properly connected.
 */

import type { Database } from '@hare/db'
import {
	users,
	workspaces,
	workspaceMembers,
	workspaceInvitations,
	agents,
	agentVersions,
	tools,
	agentTools,
	webhooks,
	webhookLogs,
	sessions,
	accounts,
	verifications,
} from '@hare/db'
import {
	createTestUser,
	createTestWorkspace,
	createTestWorkspaceMember,
	createTestAgent,
	createTestTool,
	createTestAgentTool,
	createTestWebhook,
	type TestUser,
	type TestWorkspace,
	type TestWorkspaceMember,
	type TestAgent,
	type TestTool,
	type TestWebhook,
} from '../factories'

/**
 * Result from seeding a complete workspace with owner.
 */
export interface SeedWorkspaceResult {
	user: TestUser
	workspace: TestWorkspace
	member: TestWorkspaceMember
}

/**
 * Result from seeding a complete agent setup.
 */
export interface SeedAgentResult extends SeedWorkspaceResult {
	agent: TestAgent
}

/**
 * Result from seeding an agent with tools.
 */
export interface SeedAgentWithToolsResult extends SeedAgentResult {
	tools: TestTool[]
}

/**
 * Result from seeding an agent with webhooks.
 */
export interface SeedAgentWithWebhooksResult extends SeedAgentResult {
	webhooks: TestWebhook[]
}

/**
 * Result from seeding a complete test environment.
 */
export interface SeedCompleteEnvironmentResult {
	users: TestUser[]
	workspaces: TestWorkspace[]
	members: TestWorkspaceMember[]
	agents: TestAgent[]
	tools: TestTool[]
	webhooks: TestWebhook[]
}

/**
 * Options for seeding a workspace.
 */
export interface SeedWorkspaceOptions {
	user?: Partial<TestUser>
	workspace?: Partial<TestWorkspace>
}

/**
 * Options for seeding an agent.
 */
export interface SeedAgentOptions extends SeedWorkspaceOptions {
	agent?: Partial<TestAgent>
}

/**
 * Options for seeding an agent with tools.
 */
export interface SeedAgentWithToolsOptions extends SeedAgentOptions {
	toolCount?: number
	tools?: Partial<TestTool>[]
}

/**
 * Options for seeding an agent with webhooks.
 */
export interface SeedAgentWithWebhooksOptions extends SeedAgentOptions {
	webhookCount?: number
	webhooks?: Partial<TestWebhook>[]
}

/**
 * Options for seeding a complete environment.
 */
export interface SeedCompleteEnvironmentOptions {
	userCount?: number
	workspacesPerUser?: number
	agentsPerWorkspace?: number
	toolsPerWorkspace?: number
	webhooksPerAgent?: number
}

/**
 * Seeds a workspace with an owner.
 * Creates a user, workspace, and workspace member entry.
 *
 * @example
 * ```ts
 * const { user, workspace, member } = await seedWorkspace(db)
 *
 * // With custom options
 * const { user, workspace } = await seedWorkspace(db, {
 *   user: { name: 'Admin' },
 *   workspace: { planId: 'pro' }
 * })
 * ```
 */
export async function seedWorkspace(
	db: Database,
	options: SeedWorkspaceOptions = {},
): Promise<SeedWorkspaceResult> {
	const user = createTestUser(options.user)
	const workspace = createTestWorkspace({
		ownerId: user.id,
		...options.workspace,
	})
	const member = createTestWorkspaceMember({
		workspaceId: workspace.id,
		userId: user.id,
		role: 'owner',
	})

	// Insert into database
	await db.insert(users).values(user)
	await db.insert(workspaces).values(workspace)
	await db.insert(workspaceMembers).values(member)

	return { user, workspace, member }
}

/**
 * Seeds an agent with its workspace and owner.
 *
 * @example
 * ```ts
 * const { user, workspace, agent } = await seedAgent(db)
 *
 * // With custom agent options
 * const { agent } = await seedAgent(db, {
 *   agent: { status: 'deployed', name: 'Customer Support Bot' }
 * })
 * ```
 */
export async function seedAgent(
	db: Database,
	options: SeedAgentOptions = {},
): Promise<SeedAgentResult> {
	const { user, workspace, member } = await seedWorkspace(db, options)

	const agent = createTestAgent({
		workspaceId: workspace.id,
		createdBy: user.id,
		...options.agent,
	})

	await db.insert(agents).values(agent)

	return { user, workspace, member, agent }
}

/**
 * Seeds an agent with tools.
 *
 * @example
 * ```ts
 * // Create agent with 3 default tools
 * const { agent, tools } = await seedAgentWithTools(db, { toolCount: 3 })
 *
 * // Create agent with custom tools
 * const { agent, tools } = await seedAgentWithTools(db, {
 *   tools: [
 *     { name: 'Search API', type: 'http' },
 *     { name: 'Calculator', type: 'custom' }
 *   ]
 * })
 * ```
 */
export async function seedAgentWithTools(
	db: Database,
	options: SeedAgentWithToolsOptions = {},
): Promise<SeedAgentWithToolsResult> {
	const { user, workspace, member, agent } = await seedAgent(db, options)

	const toolCount = options.toolCount ?? options.tools?.length ?? 2
	const toolList: TestTool[] = []

	for (let i = 0; i < toolCount; i++) {
		const toolOverrides = options.tools?.[i] ?? {}
		const tool = createTestTool({
			workspaceId: workspace.id,
			createdBy: user.id,
			...toolOverrides,
		})
		toolList.push(tool)

		await db.insert(tools).values(tool)

		// Link tool to agent
		const agentToolRecord = createTestAgentTool({
			agentId: agent.id,
			toolId: tool.id,
		})
		await db.insert(agentTools).values(agentToolRecord)
	}

	return { user, workspace, member, agent, tools: toolList }
}

/**
 * Seeds an agent with webhooks.
 *
 * @example
 * ```ts
 * // Create agent with 2 default webhooks
 * const { agent, webhooks } = await seedAgentWithWebhooks(db, { webhookCount: 2 })
 *
 * // Create agent with custom webhooks
 * const { agent, webhooks } = await seedAgentWithWebhooks(db, {
 *   webhooks: [
 *     { events: ['message.received'], url: 'https://slack.webhook.com/...' }
 *   ]
 * })
 * ```
 */
export async function seedAgentWithWebhooks(
	db: Database,
	options: SeedAgentWithWebhooksOptions = {},
): Promise<SeedAgentWithWebhooksResult> {
	const { user, workspace, member, agent } = await seedAgent(db, options)

	const webhookCount = options.webhookCount ?? options.webhooks?.length ?? 1
	const webhookList: TestWebhook[] = []

	for (let i = 0; i < webhookCount; i++) {
		const webhookOverrides = options.webhooks?.[i] ?? {}
		const webhook = createTestWebhook({
			agentId: agent.id,
			...webhookOverrides,
		})
		webhookList.push(webhook)

		await db.insert(webhooks).values(webhook)
	}

	return { user, workspace, member, agent, webhooks: webhookList }
}

/**
 * Seeds a complete test environment with multiple users, workspaces, agents, tools, and webhooks.
 * Useful for testing complex scenarios involving multiple entities.
 *
 * @example
 * ```ts
 * const env = await seedCompleteEnvironment(db, {
 *   userCount: 2,
 *   workspacesPerUser: 2,
 *   agentsPerWorkspace: 3,
 *   toolsPerWorkspace: 5,
 *   webhooksPerAgent: 1
 * })
 * ```
 */
export async function seedCompleteEnvironment(
	db: Database,
	options: SeedCompleteEnvironmentOptions = {},
): Promise<SeedCompleteEnvironmentResult> {
	const {
		userCount = 1,
		workspacesPerUser = 1,
		agentsPerWorkspace = 1,
		toolsPerWorkspace = 2,
		webhooksPerAgent = 1,
	} = options

	const userList: TestUser[] = []
	const workspaceList: TestWorkspace[] = []
	const memberList: TestWorkspaceMember[] = []
	const agentList: TestAgent[] = []
	const toolList: TestTool[] = []
	const webhookList: TestWebhook[] = []

	for (let u = 0; u < userCount; u++) {
		const user = createTestUser()
		userList.push(user)
		await db.insert(users).values(user)

		for (let w = 0; w < workspacesPerUser; w++) {
			const workspace = createTestWorkspace({ ownerId: user.id })
			workspaceList.push(workspace)
			await db.insert(workspaces).values(workspace)

			const member = createTestWorkspaceMember({
				workspaceId: workspace.id,
				userId: user.id,
				role: 'owner',
			})
			memberList.push(member)
			await db.insert(workspaceMembers).values(member)

			// Create tools for this workspace
			for (let t = 0; t < toolsPerWorkspace; t++) {
				const tool = createTestTool({
					workspaceId: workspace.id,
					createdBy: user.id,
				})
				toolList.push(tool)
				await db.insert(tools).values(tool)
			}

			// Create agents for this workspace
			for (let a = 0; a < agentsPerWorkspace; a++) {
				const agent = createTestAgent({
					workspaceId: workspace.id,
					createdBy: user.id,
				})
				agentList.push(agent)
				await db.insert(agents).values(agent)

				// Create webhooks for this agent
				for (let wh = 0; wh < webhooksPerAgent; wh++) {
					const webhook = createTestWebhook({ agentId: agent.id })
					webhookList.push(webhook)
					await db.insert(webhooks).values(webhook)
				}
			}
		}
	}

	return {
		users: userList,
		workspaces: workspaceList,
		members: memberList,
		agents: agentList,
		tools: toolList,
		webhooks: webhookList,
	}
}

/**
 * Cleans up all seeded data from the database.
 * Useful for test teardown.
 *
 * Note: Order matters due to foreign key constraints.
 * Deletes in reverse order of creation.
 */
export async function cleanupSeededData(db: Database): Promise<void> {
	// Delete in order respecting foreign key constraints
	await db.delete(webhookLogs)
	await db.delete(webhooks)
	await db.delete(agentTools)
	await db.delete(tools)
	await db.delete(agentVersions)
	await db.delete(agents)
	await db.delete(workspaceInvitations)
	await db.delete(workspaceMembers)
	await db.delete(workspaces)
	await db.delete(sessions)
	await db.delete(accounts)
	await db.delete(verifications)
	await db.delete(users)
}
