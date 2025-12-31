'use client'

import type { MemberRole, SendInvitationInput, WorkspaceInvitation, WorkspaceMember } from '@hare/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiClientError } from '../client'

// Re-export types for convenience
export type {
	MemberRole,
	SendInvitationInput,
	WorkspaceInvitation,
	WorkspaceMember,
} from '@hare/types'

/**
 * Helper to handle Hono RPC response with proper error handling.
 */
async function handleResponse<T>(res: Response & { json(): Promise<T> }): Promise<T> {
	if (!res.ok) {
		let errorMessage = `Request failed with status ${res.status}`
		let errorCode: string | undefined
		try {
			const error = (await res.json()) as { error: string; code?: string }
			errorMessage = error.error ?? errorMessage
			errorCode = error.code
		} catch {
			// Response wasn't JSON
		}
		throw new ApiClientError(errorMessage, res.status, errorCode)
	}
	return res.json()
}

/**
 * Hook to fetch workspace members
 */
export function useWorkspaceMembersQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'members'],
		queryFn: async () => {
			const res = await api.workspaces[':id'].members.$get({
				param: { id: workspaceId! },
			})
			return handleResponse(res)
		},
		enabled: !!workspaceId,
	})
}

/**
 * Hook to fetch workspace invitations
 */
export function useWorkspaceInvitationsQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'invitations'],
		queryFn: async () => {
			const res = await api.workspaces[':id'].invites.$get({
				param: { id: workspaceId! },
			})
			return handleResponse(res)
		},
		enabled: !!workspaceId,
	})
}

/**
 * Hook to send a workspace invitation
 */
export function useSendInvitationMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ workspaceId, data }: { workspaceId: string; data: SendInvitationInput }) => {
			const res = await api.workspaces[':id'].invites.$post({
				param: { id: workspaceId },
				json: data,
			})
			return handleResponse(res)
		},
		onSuccess: (_, { workspaceId }) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'invitations'] })
		},
	})
}

/**
 * Hook to revoke a workspace invitation
 */
export function useRevokeInvitationMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ workspaceId, inviteId }: { workspaceId: string; inviteId: string }) => {
			const res = await api.workspaces[':id'].invites[':inviteId'].$delete({
				param: { id: workspaceId, inviteId },
			})
			return handleResponse(res)
		},
		onSuccess: (_, { workspaceId }) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'invitations'] })
		},
	})
}

/**
 * Hook to remove a workspace member
 */
export function useRemoveMemberMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
			const res = await api.workspaces[':id'].members[':userId'].$delete({
				param: { id: workspaceId, userId },
			})
			return handleResponse(res)
		},
		onSuccess: (_, { workspaceId }) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] })
		},
	})
}

/**
 * Hook to update a member's role
 */
export function useUpdateMemberRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({
			workspaceId,
			userId,
			role,
		}: {
			workspaceId: string
			userId: string
			role: MemberRole
		}) => {
			const res = await api.workspaces[':id'].members[':userId'].$patch({
				param: { id: workspaceId, userId },
				json: { role },
			})
			return handleResponse(res)
		},
		onSuccess: (_, { workspaceId }) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] })
		},
	})
}
