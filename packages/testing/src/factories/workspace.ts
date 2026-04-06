/**
 * Workspace factory for creating test workspace data.
 */

import type { InvitationStatus, MemberRole, PlanId, WorkspaceRole } from '@hare/config'
import { createId } from '@hare/db'

/**
 * Workspace data shape matching the database schema.
 */
export interface TestWorkspace {
	id: string
	name: string
	slug: string
	description: string | null
	ownerId: string
	stripeCustomerId: string | null
	stripeSubscriptionId: string | null
	planId: PlanId | null
	currentPeriodEnd: Date | null
	createdAt: Date
	updatedAt: Date
}

/**
 * Workspace member data shape matching the database schema.
 */
export interface TestWorkspaceMember {
	id: string
	workspaceId: string
	userId: string
	role: WorkspaceRole
	createdAt: Date
	updatedAt: Date
}

/**
 * Workspace invitation data shape matching the database schema.
 */
export interface TestWorkspaceInvitation {
	id: string
	workspaceId: string
	email: string
	role: MemberRole
	token: string
	invitedBy: string
	status: InvitationStatus
	expiresAt: Date
	createdAt: Date
	updatedAt: Date
}

export type TestWorkspaceOverrides = Partial<TestWorkspace>
export type TestWorkspaceMemberOverrides = Partial<TestWorkspaceMember>
export type TestWorkspaceInvitationOverrides = Partial<TestWorkspaceInvitation>

let workspaceCounter = 0

/**
 * Creates a test workspace with sensible defaults.
 *
 * @example
 * ```ts
 * // Create with defaults (requires ownerId)
 * const workspace = createTestWorkspace({ ownerId: user.id })
 *
 * // Create with custom name
 * const workspace = createTestWorkspace({ ownerId: user.id, name: 'My Workspace' })
 *
 * // Create with pro plan
 * const workspace = createTestWorkspace({ ownerId: user.id, planId: 'pro' })
 * ```
 */
export function createTestWorkspace(
	overrides: TestWorkspaceOverrides & { ownerId: string },
): TestWorkspace {
	workspaceCounter++
	const now = new Date()
	const name = overrides.name ?? `Test Workspace ${workspaceCounter}`

	return {
		id: overrides.id ?? createId(),
		name,
		slug: overrides.slug ?? `test-workspace-${workspaceCounter}`,
		description: overrides.description ?? null,
		ownerId: overrides.ownerId,
		stripeCustomerId: overrides.stripeCustomerId ?? null,
		stripeSubscriptionId: overrides.stripeSubscriptionId ?? null,
		planId: overrides.planId ?? 'free',
		currentPeriodEnd: overrides.currentPeriodEnd ?? null,
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	}
}

/**
 * Creates a test workspace member.
 *
 * @example
 * ```ts
 * const member = createTestWorkspaceMember({
 *   workspaceId: workspace.id,
 *   userId: user.id,
 *   role: 'admin'
 * })
 * ```
 */
export function createTestWorkspaceMember(
	overrides: TestWorkspaceMemberOverrides & { workspaceId: string; userId: string },
): TestWorkspaceMember {
	const now = new Date()

	return {
		id: overrides.id ?? createId(),
		workspaceId: overrides.workspaceId,
		userId: overrides.userId,
		role: overrides.role ?? 'member',
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	}
}

/**
 * Creates a test workspace invitation.
 *
 * @example
 * ```ts
 * const invitation = createTestWorkspaceInvitation({
 *   workspaceId: workspace.id,
 *   email: 'newuser@example.com',
 *   invitedBy: user.id
 * })
 * ```
 */
export function createTestWorkspaceInvitation(
	overrides: TestWorkspaceInvitationOverrides & {
		workspaceId: string
		email: string
		invitedBy: string
	},
): TestWorkspaceInvitation {
	const now = new Date()
	const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

	return {
		id: overrides.id ?? createId(),
		workspaceId: overrides.workspaceId,
		email: overrides.email,
		role: overrides.role ?? 'member',
		token: overrides.token ?? createId(),
		invitedBy: overrides.invitedBy,
		status: overrides.status ?? 'pending',
		expiresAt: overrides.expiresAt ?? expiresAt,
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	}
}

/**
 * Creates multiple test workspaces at once.
 */
export function createTestWorkspaces(
	count: number,
	overrides: TestWorkspaceOverrides & { ownerId: string },
): TestWorkspace[] {
	return Array.from({ length: count }, () => createTestWorkspace(overrides))
}

/**
 * Reset the workspace counter. Useful for test isolation.
 */
export function __resetWorkspaceCounter(): void {
	workspaceCounter = 0
}
