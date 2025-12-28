'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@shared/api'
import type { CreateWorkspaceInput, MemberRole, SendInvitationInput } from '@shared/api'

export type {
	CreateWorkspaceInput,
	MemberRole,
	SendInvitationInput,
	Workspace,
	WorkspaceInvitation,
	WorkspaceMember,
} from '@shared/api'

export function useWorkspaces() {
	return useQuery({
		queryKey: ['workspaces'],
		queryFn: () => apiClient.workspaces.list(),
	})
}

export function useWorkspace(id: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', id],
		queryFn: () => apiClient.workspaces.get(id!),
		enabled: !!id,
	})
}

export function useCreateWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateWorkspaceInput) => apiClient.workspaces.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}

export function useUpdateWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<CreateWorkspaceInput> }) =>
			apiClient.workspaces.update(id, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
			queryClient.invalidateQueries({ queryKey: ['workspaces', id] })
		},
	})
}

export function useDeleteWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => apiClient.workspaces.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}

// Team member hooks
export function useWorkspaceMembers(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'members'],
		queryFn: () => apiClient.workspaces.members.list(workspaceId!),
		enabled: !!workspaceId,
	})
}

export function useWorkspaceInvitations(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'invitations'],
		queryFn: () => apiClient.workspaces.invitations.list(workspaceId!),
		enabled: !!workspaceId,
	})
}

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
