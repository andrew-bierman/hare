'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface AgentConfig {
	temperature?: number
	maxTokens?: number
	topP?: number
	topK?: number
	stopSequences?: string[]
}

export interface Agent {
	id: string
	workspaceId: string
	name: string
	description: string | null
	model: string
	instructions: string
	config?: AgentConfig
	status: 'draft' | 'deployed' | 'archived'
	toolIds: string[]
	createdAt: string
	updatedAt: string
}

export interface CreateAgentInput {
	name: string
	description?: string
	model: string
	instructions?: string
	config?: AgentConfig
	toolIds?: string[]
}

export interface UpdateAgentInput {
	name?: string
	description?: string
	model?: string
	instructions?: string
	config?: AgentConfig
	status?: 'draft' | 'deployed' | 'archived'
	toolIds?: string[]
}

export interface DeploymentResult {
	id: string
	status: 'deployed'
	deployedAt: string
	version: string
}

async function fetchAgents(workspaceId: string): Promise<{ agents: Agent[] }> {
	const response = await fetch(`/api/agents?workspaceId=${workspaceId}`)
	if (!response.ok) {
		throw new Error('Failed to fetch agents')
	}
	return response.json()
}

async function fetchAgent(id: string, workspaceId: string): Promise<Agent> {
	const response = await fetch(`/api/agents/${id}?workspaceId=${workspaceId}`)
	if (!response.ok) {
		throw new Error('Failed to fetch agent')
	}
	return response.json()
}

async function createAgent(workspaceId: string, data: CreateAgentInput): Promise<Agent> {
	const response = await fetch(`/api/agents?workspaceId=${workspaceId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	})
	if (!response.ok) {
		const error = await response.json()
		throw new Error(error.error || 'Failed to create agent')
	}
	return response.json()
}

async function updateAgent(id: string, workspaceId: string, data: UpdateAgentInput): Promise<Agent> {
	const response = await fetch(`/api/agents/${id}?workspaceId=${workspaceId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	})
	if (!response.ok) {
		const error = await response.json()
		throw new Error(error.error || 'Failed to update agent')
	}
	return response.json()
}

async function deleteAgent(id: string, workspaceId: string): Promise<void> {
	const response = await fetch(`/api/agents/${id}?workspaceId=${workspaceId}`, {
		method: 'DELETE',
	})
	if (!response.ok) {
		const error = await response.json()
		throw new Error(error.error || 'Failed to delete agent')
	}
}

async function deployAgent(id: string, workspaceId: string, version?: string): Promise<DeploymentResult> {
	const response = await fetch(`/api/agents/${id}/deploy?workspaceId=${workspaceId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ version }),
	})
	if (!response.ok) {
		const error = await response.json()
		throw new Error(error.error || 'Failed to deploy agent')
	}
	return response.json()
}

export function useAgents(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['agents', workspaceId],
		queryFn: () => fetchAgents(workspaceId!),
		enabled: !!workspaceId,
	})
}

export function useAgent(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['agents', workspaceId, id],
		queryFn: () => fetchAgent(id!, workspaceId!),
		enabled: !!id && !!workspaceId,
	})
}

export function useCreateAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateAgentInput) => createAgent(workspaceId!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
		},
	})
}

export function useUpdateAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateAgentInput }) =>
			updateAgent(id, workspaceId!, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId, id] })
		},
	})
}

export function useDeleteAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => deleteAgent(id, workspaceId!),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
		},
	})
}

export function useDeployAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, version }: { id: string; version?: string }) =>
			deployAgent(id, workspaceId!, version),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId, id] })
		},
	})
}

// Available models for the UI
export const AVAILABLE_MODELS = [
	{ id: 'llama-3.3-70b', name: 'Llama 3.3 70B', description: 'Most capable open model' },
	{ id: 'llama-3.1-8b', name: 'Llama 3.1 8B', description: 'Fast and efficient' },
	{ id: 'llama-3.2-3b', name: 'Llama 3.2 3B', description: 'Lightweight model' },
	{ id: 'mistral-7b', name: 'Mistral 7B', description: 'Excellent reasoning' },
	{ id: 'deepseek-r1-32b', name: 'DeepSeek R1 32B', description: 'Advanced reasoning' },
	{ id: 'qwen-1.5-14b', name: 'Qwen 1.5 14B', description: 'Multilingual support' },
	{ id: 'gemma-7b', name: 'Gemma 7B', description: 'Google open model' },
] as const
