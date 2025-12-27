// API client for desktop app
// Connects to the hosted Hare API

const API_URL = import.meta.env.VITE_API_URL || 'https://hare.pages.dev'

export interface Agent {
	id: string
	name: string
	description?: string
	model: string
	status: 'draft' | 'deployed' | 'archived'
	instructions?: string
	toolIds?: string[]
	createdAt: string
	updatedAt: string
}

export interface Tool {
	id: string
	name: string
	description: string
	category: string
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${API_URL}/api${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
		credentials: 'include',
	})

	if (!response.ok) {
		const error = await response.text()
		throw new Error(error || `API error: ${response.status}`)
	}

	return response.json()
}

export const api = {
	// Agents
	getAgents: () => fetchApi<{ agents: Agent[] }>('/agents'),
	getAgent: (id: string) => fetchApi<{ agent: Agent }>(`/agents/${id}`),
	createAgent: (data: Partial<Agent>) =>
		fetchApi<{ agent: Agent }>('/agents', {
			method: 'POST',
			body: JSON.stringify(data),
		}),
	updateAgent: (id: string, data: Partial<Agent>) =>
		fetchApi<{ agent: Agent }>(`/agents/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(data),
		}),
	deleteAgent: (id: string) => fetchApi<void>(`/agents/${id}`, { method: 'DELETE' }),

	// Tools
	getTools: () => fetchApi<{ tools: Tool[] }>('/tools'),
}
