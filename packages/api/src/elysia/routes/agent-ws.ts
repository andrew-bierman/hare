/**
 * Agent WebSocket Routes
 *
 * WebSocket connections to Cloudflare Agents SDK Durable Objects.
 * Also provides agent state, configuration, schedules, and AI SDK chat.
 */

import {
	type AgentConfig,
	createAgentFromConfig,
	isWebSocketRequest,
	routeHttpToAgent,
	routeWebSocketToAgent,
} from '@hare/agent'
import { getErrorMessage } from '@hare/checks'
import { config } from '@hare/config'
import type { Database } from '@hare/db'
import { agents, workspaceMembers, workspaces } from '@hare/db/schema'
import type { CloudflareEnv } from '@hare/types'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { and, eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { type AuthUserContext, optionalAuthPlugin } from '../context'

// =============================================================================
// Helpers
// =============================================================================

async function hasWorkspaceAccess(
	db: Database,
	userId: string,
	workspaceId: string,
): Promise<boolean> {
	const [workspace] = await db
		.select({ ownerId: workspaces.ownerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
	if (!workspace) return false
	if (workspace.ownerId === userId) return true

	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
	return !!membership
}

async function hasWorkspaceWriteAccess(
	db: Database,
	userId: string,
	workspaceId: string,
): Promise<boolean> {
	const [workspace] = await db
		.select({ ownerId: workspaces.ownerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
	if (!workspace) return false
	if (workspace.ownerId === userId) return true

	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
	if (!membership) return false
	return membership.role !== 'viewer'
}

// =============================================================================
// Chat handler (shared between /agent-ws and /chat mount points)
// =============================================================================

async function handleChat(options: {
	agentId: string
	db: Database
	cfEnv: CloudflareEnv
	user: AuthUserContext | null
	request: Request
}) {
	const { agentId, db, cfEnv, user, request } = options

	let body: { messages?: UIMessage[]; sessionId?: string }
	try {
		body = await request.json()
	} catch {
		return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
	}

	const [agentConfig] = await db.select().from(agents).where(eq(agents.id, agentId))

	if (!agentConfig) return Response.json({ error: 'Agent not found' }, { status: 404 })
	if (agentConfig.status !== config.enums.agentStatus.DEPLOYED)
		return Response.json({ error: 'Agent not deployed' }, { status: 400 })

	if (user?.id) {
		const hasAccess = await hasWorkspaceAccess(db, user.id, agentConfig.workspaceId)
		if (!hasAccess) return Response.json({ error: 'Unauthorized' }, { status: 403 })
	}

	if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
		return Response.json({ error: 'No messages provided' }, { status: 400 })
	}

	try {
		const modelMessages = await convertToModelMessages(body.messages)
		const agent = await createAgentFromConfig({
			agentConfig: agentConfig as AgentConfig,
			db,
			env: cfEnv,
			includeSystemTools: true,
			userId: user?.id,
		})

		const result = streamText({
			model: agent.model,
			system: agent.instructions || undefined,
			messages: modelMessages,
		})

		return result.toUIMessageStreamResponse({
			headers: { 'X-Session-Id': body.sessionId || crypto.randomUUID() },
		})
	} catch (err) {
		// biome-ignore lint/suspicious/noConsole: error reporting
		console.error('[chat] Error:', err)
		return Response.json(
			{ error: getErrorMessage(err) || 'Internal server error' },
			{ status: 500 },
		)
	}
}

// =============================================================================
// Routes
// =============================================================================

export const agentWsRoutes = new Elysia({ prefix: '/agent-ws', name: 'agent-ws-routes' })
	.use(optionalAuthPlugin)

	// WebSocket upgrade
	.get('/agents/:id/ws', async ({ db, cfEnv, user, params, request }) => {
		if (!isWebSocketRequest(request)) {
			return status(400, { error: 'WebSocket upgrade required' })
		}

		const [agent] = await db.select().from(agents).where(eq(agents.id, params.id))
		if (!agent) return status(404, { error: 'Agent not found' })
		if (agent.status !== config.enums.agentStatus.DEPLOYED)
			return status(400, { error: 'Agent not deployed' })

		if (user?.id) {
			const hasAccess = await hasWorkspaceAccess(db, user.id, agent.workspaceId)
			if (!hasAccess) return status(403, { error: 'Unauthorized: no access to this workspace' })
		}

		const headers = new Headers(request.headers)
		headers.set('x-user-id', user?.id || 'anonymous')
		headers.set('x-workspace-id', agent.workspaceId)

		const wsRequest = new Request(request.url, { method: request.method, headers })
		return routeWebSocketToAgent({ request: wsRequest, env: cfEnv, agentId: params.id })
	})

	// Get agent state
	.get('/agents/:id/state', async ({ db, cfEnv, user, params, request }) => {
		const [agent] = await db.select().from(agents).where(eq(agents.id, params.id))
		if (!agent) return status(404, { error: 'Agent not found' })

		if (user?.id) {
			const hasAccess = await hasWorkspaceAccess(db, user.id, agent.workspaceId)
			if (!hasAccess) return status(403, { error: 'Unauthorized' })
		}

		const response = await routeHttpToAgent({
			request,
			env: cfEnv,
			agentId: params.id,
			path: '/state',
		})
		return response.json()
	})

	// Configure agent
	.post('/agents/:id/configure', async ({ db, cfEnv, user, params, request }) => {
		const [agent] = await db.select().from(agents).where(eq(agents.id, params.id))
		if (!agent) return status(404, { error: 'Agent not found' })

		if (!user?.id) return status(401, { error: 'Authentication required' })

		const hasAccess = await hasWorkspaceWriteAccess(db, user.id, agent.workspaceId)
		if (!hasAccess) return status(403, { error: 'No write access' })

		let body: { name?: string; instructions?: string; model?: string; workspaceId?: string }
		try {
			body = (await request.json()) as typeof body
		} catch {
			return status(400, { error: 'Invalid JSON body' })
		}

		const configRequest = new Request(new URL('/configure', request.url).toString(), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				agentId: params.id,
				workspaceId: agent.workspaceId,
				name: body.name || agent.name,
				instructions: body.instructions || agent.instructions,
				model: body.model || agent.model,
			}),
		})

		const response = await routeHttpToAgent({
			request: configRequest,
			env: cfEnv,
			agentId: params.id,
			path: '/configure',
		})
		const state = await response.json()
		return { success: true, state }
	})

	// Get agent schedules
	.get('/agents/:id/schedules', async ({ db, cfEnv, user, params, request }) => {
		const [agent] = await db.select().from(agents).where(eq(agents.id, params.id))
		if (!agent) return status(404, { error: 'Agent not found' })

		if (user?.id) {
			const hasAccess = await hasWorkspaceAccess(db, user.id, agent.workspaceId)
			if (!hasAccess) return status(403, { error: 'Unauthorized' })
		}

		const response = await routeHttpToAgent({
			request,
			env: cfEnv,
			agentId: params.id,
			path: '/schedules',
		})
		return response.json()
	})

	// AI SDK chat endpoint
	.post('/agents/:id/chat', async ({ db, cfEnv, user, params, request }) => {
		return handleChat({ agentId: params.id, db, cfEnv, user, request })
	})

// Dedicated chat sub-router for AI SDK streaming (mounted separately at /api/stream-chat)
export const chatAppRoutes = new Elysia({ prefix: '/stream-chat', name: 'chat-app-routes' })
	.use(optionalAuthPlugin)
	.post('/agents/:id/chat', async ({ db, cfEnv, user, params, request }) => {
		return handleChat({ agentId: params.id, db, cfEnv, user, request })
	})
