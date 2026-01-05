'use client'

import type { MemberRole, SendInvitationInput, WorkspaceInvitation, WorkspaceMember } from '@hare/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workspaces } from '@hare/api-client'

// Re-export types for convenience
export type {
	MemberRole,
	SendInvitationInput,
	WorkspaceInvitation,
	WorkspaceMember,
} from '@hare/types'

/**
 * Hook to fetch workspace members
 */
export function useWorkspaceMembersQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'members'],
		queryFn: async () => {
			const res = await workspaces[':id'].members.$get({
				param: { id: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
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
			const res = await workspaces[':id'].invites.$get({
				param: { id: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
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
			const res = await workspaces[':id'].invites.$post({
				param: { id: workspaceId },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
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
			const res = await workspaces[':id'].invites[':inviteId'].$delete({
				param: { id: workspaceId, inviteId },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
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
			const res = await workspaces[':id'].members[':userId'].$delete({
				param: { id: workspaceId, userId },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
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
			const res = await workspaces[':id'].members[':userId'].$patch({
				param: { id: workspaceId, userId },
				json: { role },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: (_, { workspaceId }) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] })
		},
	})
}
