/**
 * Elysia Context Plugins
 *
 * Composable plugins providing Cloudflare bindings, auth, and workspace context.
 *
 * Architecture:
 * - cfContext: provides cfEnv + db via derive
 * - authPlugin: macro `auth: true` resolves user/session
 * - workspaceResolve: resolve that adds workspace + role (use after auth)
 * - Permission guards: onBeforeHandle checks for write/admin/owner
 *
 * Follows Elysia best practices:
 * - CF env via `cloudflare:workers` module
 * - Auth via macro pattern (recommended by Elysia + Better Auth docs)
 * - Zod schemas via Standard Schema support (Elysia 1.4+)
 */

import { type AuthServerEnv, createAuth } from '@hare/auth/server'
import { createDb, type Database } from '@hare/db'
import { workspaceMembers, workspaces } from '@hare/db/schema'
import type { CloudflareEnv, WorkspaceRole } from '@hare/types'
import { isWorkspaceRole } from '@hare/types'
import { and, eq } from 'drizzle-orm'
import { Elysia } from 'elysia'

// =============================================================================
// Error Classes
// =============================================================================

export class CloudflareEnvError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'CloudflareEnvError'
	}
}

// =============================================================================
// Types
// =============================================================================

export interface AuthUserContext {
	id: string
	email: string
	name: string | null
	image: string | null
}

export interface WorkspaceInfo {
	id: string
	name: string
	slug: string
	ownerId: string
}

// =============================================================================
// Helpers
// =============================================================================

function getAuthServerEnv(cfEnv: CloudflareEnv): AuthServerEnv {
	const env = cfEnv as CloudflareEnv & {
		BETTER_AUTH_SECRET?: string
		GOOGLE_CLIENT_ID?: string
		GOOGLE_CLIENT_SECRET?: string
		GITHUB_CLIENT_ID?: string
		GITHUB_CLIENT_SECRET?: string
	}

	if (!env.BETTER_AUTH_SECRET) {
		throw new Error('BETTER_AUTH_SECRET environment variable is required')
	}

	return {
		BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
		APP_URL: env.APP_URL ?? 'http://localhost:3000',
		GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
		GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
		GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
	}
}

export function getD1(cfEnv: CloudflareEnv): D1Database {
	if (cfEnv?.DB) return cfEnv.DB
	throw new CloudflareEnvError(
		'D1 database binding not available. Ensure DB is configured in wrangler.jsonc.',
	)
}

export function getDbFromEnv(cfEnv: CloudflareEnv): Database {
	return createDb(getD1(cfEnv))
}

export function hasPermission(
	role: WorkspaceRole,
	action: 'read' | 'write' | 'admin' | 'owner',
): boolean {
	const permissions: Record<WorkspaceRole, Set<string>> = {
		owner: new Set(['read', 'write', 'admin', 'owner']),
		admin: new Set(['read', 'write', 'admin']),
		member: new Set(['read', 'write']),
		viewer: new Set(['read']),
	}
	return permissions[role]?.has(action) ?? false
}

// =============================================================================
// Shared auth resolution logic
// =============================================================================

async function resolveAuthUser(cfEnv: CloudflareEnv, headers: Headers) {
	const authEnv = getAuthServerEnv(cfEnv)
	const auth = createAuth({ d1: cfEnv.DB, env: authEnv })
	return auth.api.getSession({ headers })
}

async function resolveWorkspaceAccess(options: { db: Database; userId: string; request: Request }) {
	const { db, userId, request } = options

	const workspaceId =
		request.headers.get('X-Workspace-Id') ?? new URL(request.url).searchParams.get('workspaceId')

	if (!workspaceId) return null

	const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))
	if (!ws) return null

	let workspaceRole: WorkspaceRole

	if (ws.ownerId === userId) {
		workspaceRole = 'owner'
	} else {
		const [membership] = await db
			.select()
			.from(workspaceMembers)
			.where(
				and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
			)

		if (!membership || !isWorkspaceRole(membership.role)) return null
		workspaceRole = membership.role as WorkspaceRole
	}

	return {
		workspace: {
			id: ws.id,
			name: ws.name,
			slug: ws.slug,
			ownerId: ws.ownerId,
		} as WorkspaceInfo,
		workspaceId: ws.id,
		workspaceRole,
	}
}

// =============================================================================
// Plugin: Cloudflare env + DB
// =============================================================================

/**
 * Provides `cfEnv` (CloudflareEnv) and `db` (Drizzle instance) to all routes.
 * Uses the `cloudflare:workers` module to access env bindings.
 */
export const cfContext = new Elysia({ name: 'cf-context' }).derive({ as: 'global' }, () => {
	// CF Workers exposes env via the cloudflare:workers module
	// This is populated per-request by the Workers runtime
	const { env } = require('cloudflare:workers') as { env: CloudflareEnv }
	const db = getDbFromEnv(env)
	return { cfEnv: env, db }
})

// =============================================================================
// Plugin: Auth (macro pattern)
// =============================================================================

/**
 * Auth plugin using the macro pattern recommended by Elysia + Better Auth docs.
 *
 * Add `{ auth: true }` to any route to require authentication:
 * ```ts
 * .use(authPlugin)
 * .get('/me', ({ user }) => user, { auth: true })
 * ```
 */
export const authPlugin = new Elysia({ name: 'auth' }).use(cfContext).macro({
	auth: {
		async resolve({ cfEnv, request, status }) {
			const session = await resolveAuthUser(cfEnv, request.headers)

			if (!session?.user) {
				return status(401, { error: 'Unauthorized' })
			}

			return {
				user: {
					id: session.user.id,
					email: session.user.email,
					name: session.user.name ?? null,
					image: session.user.image ?? null,
				} as AuthUserContext,
				session: {
					id: session.session.id,
					expiresAt: session.session.expiresAt,
				},
			}
		},
	},
})

// =============================================================================
// Plugin: Optional Auth (resolve, does not block)
// =============================================================================

/**
 * Resolves user if session cookie exists, but does not reject.
 * Provides `user: AuthUserContext | null` to the context.
 */
export const optionalAuthPlugin = new Elysia({ name: 'optional-auth' })
	.use(cfContext)
	.resolve({ as: 'scoped' }, async ({ cfEnv, request }) => {
		try {
			const session = await resolveAuthUser(cfEnv, request.headers)
			if (session?.user) {
				return {
					user: {
						id: session.user.id,
						email: session.user.email,
						name: session.user.name ?? null,
						image: session.user.image ?? null,
					} as AuthUserContext,
				}
			}
		} catch {
			// Auth not available
		}
		return { user: null as AuthUserContext | null }
	})

// =============================================================================
// Shared auth + workspace resolution
// =============================================================================

async function resolveAuthAndWorkspace(options: {
	cfEnv: CloudflareEnv
	db: Database
	request: Request
	status: (code: number, body: unknown) => unknown
	action?: 'read' | 'write' | 'admin' | 'owner'
}) {
	const { cfEnv, db, request, status: statusFn, action } = options
	const session = await resolveAuthUser(cfEnv, request.headers)
	if (!session?.user) return statusFn(401, { error: 'Unauthorized' })
	const user = {
		id: session.user.id,
		email: session.user.email,
		name: session.user.name ?? null,
		image: session.user.image ?? null,
	} as AuthUserContext
	const result = await resolveWorkspaceAccess({ db, userId: user.id, request })
	if (!result) return statusFn(403, { error: 'Workspace access denied' })
	if (action && !hasPermission(result.workspaceRole, action)) {
		return statusFn(403, {
			error: `${action.charAt(0).toUpperCase() + action.slice(1)} access required`,
		})
	}
	return { user, ...result }
}

// =============================================================================
// Plugin: Workspace (macro pattern)
// =============================================================================

/**
 * Workspace plugin - resolves auth + workspace + role in one macro.
 *
 * Add `{ workspace: true }` to any route:
 * ```ts
 * .use(workspacePlugin)
 * .get('/agents', ({ user, workspace, workspaceRole }) => ..., { workspace: true })
 * ```
 */
export const workspacePlugin = new Elysia({ name: 'workspace' }).use(cfContext).macro({
	workspace: {
		async resolve({ cfEnv, db, request, status }) {
			return resolveAuthAndWorkspace({ cfEnv, db, request, status })
		},
	},
})

// =============================================================================
// Plugin: Write access (workspace + write permission)
// =============================================================================

/**
 * Write-access plugin. Resolves auth + workspace + requires write permission.
 *
 * ```ts
 * .use(writePlugin)
 * .get('/agents', ({ user, workspace }) => ..., { writeAccess: true })
 * ```
 */
export const writePlugin = new Elysia({ name: 'write-access' }).use(cfContext).macro({
	writeAccess: {
		async resolve({ cfEnv, db, request, status }) {
			return resolveAuthAndWorkspace({ cfEnv, db, request, status, action: 'write' })
		},
	},
})

// =============================================================================
// Plugin: Admin access (workspace + admin permission)
// =============================================================================

export const adminPlugin = new Elysia({ name: 'admin-access' }).use(cfContext).macro({
	adminAccess: {
		async resolve({ cfEnv, db, request, status }) {
			return resolveAuthAndWorkspace({ cfEnv, db, request, status, action: 'admin' })
		},
	},
})

// =============================================================================
// Plugin: Owner access (workspace + owner permission)
// =============================================================================

export const ownerPlugin = new Elysia({ name: 'owner-access' }).use(cfContext).macro({
	ownerAccess: {
		async resolve({ cfEnv, db, request, status }) {
			return resolveAuthAndWorkspace({ cfEnv, db, request, status, action: 'owner' })
		},
	},
})

// =============================================================================
// Re-exports
// =============================================================================

export { getAuthServerEnv, resolveAuthUser, resolveWorkspaceAccess }
