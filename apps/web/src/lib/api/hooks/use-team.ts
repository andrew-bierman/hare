'use client'

import type { MemberRole, SendInvitationInput } from '@hare/api'
import { apiClient } from '@hare/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Re-export types for convenience
export type {
	MemberRole,
	SendInvitationInput,
	WorkspaceInvitation,
	WorkspaceMember,
} from '@hare/api'

/**
 * Hook to fetch workspace members
 */
export function useWorkspaceMembers(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'members'],
		queryFn: () => apiClient.workspaces.members.list(workspaceId!),
		enabled: !!workspaceId,
	})
}

/**
 * Hook to fetch workspace invitations
 */
export function useWorkspaceInvitations(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'invitations'],
		queryFn: () => apiClient.workspaces.invitations.list(workspaceId!),
		enabled: !!workspaceId,
	})
}

/**
 * Hook to send a workspace invitation
 */
export function useSendInvitation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ workspaceId, data }: { workspaceId: string; data: SendInvitationInput }) =>
			apiClient.workspaces.invitations.send(workspaceId, data),
		onSuccess: (_, { workspaceId }) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'invitations'] })
		},
	})
}

/**
 * Hook to revoke a workspace invitation
 */
export function useRevokeInvitation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ workspaceId, inviteId }: { workspaceId: string; inviteId: string }) =>
			apiClient.workspaces.invitations.revoke(workspaceId, inviteId),
		onSuccess: (_, { workspaceId }) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'invitations'] })
		},
	})
}

/**
 * Hook to remove a workspace member
 */
export function useRemoveMember() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
			apiClient.workspaces.members.remove(workspaceId, userId),
		onSuccess: (_, { workspaceId }) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] })
		},
	})
}

/**
 * Hook to update a member's role
 */
export function useUpdateMemberRole() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({
			workspaceId,
			userId,
			role,
		}: {
			workspaceId: string
			userId: string
			role: MemberRole
		}) => apiClient.workspaces.members.updateRole(workspaceId, userId, role),
		onSuccess: (_, { workspaceId }) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] })
		},
	})
}
