import { describe, expect, it } from 'vitest'
import {
	AgentConfigSchema,
	AgentStatusSchema,
	ChatRequestSchema,
	CreateAgentSchema,
	CreateToolSchema,
	CreateWorkspaceSchema,
	SignInSchema,
	SignUpSchema,
	ToolTypeSchema,
	WorkspaceRoleSchema,
} from '../schemas'

describe('API Schemas', () => {
	describe('CreateAgentSchema', () => {
		it('validates a valid agent creation request', () => {
			const validAgent = {
				name: 'Test Agent',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				instructions: 'You are a helpful assistant.',
			}
			const result = CreateAgentSchema.safeParse(validAgent)
			expect(result.success).toBe(true)
		})

		it('rejects empty name', () => {
			const invalidAgent = {
				name: '',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				instructions: 'You are a helpful assistant.',
			}
			const result = CreateAgentSchema.safeParse(invalidAgent)
			expect(result.success).toBe(false)
		})

		it('rejects name longer than 100 characters', () => {
			const invalidAgent = {
				name: 'a'.repeat(101),
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				instructions: 'You are a helpful assistant.',
			}
			const result = CreateAgentSchema.safeParse(invalidAgent)
			expect(result.success).toBe(false)
		})

		it('rejects empty instructions', () => {
			const invalidAgent = {
				name: 'Test Agent',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				instructions: '',
			}
			const result = CreateAgentSchema.safeParse(invalidAgent)
			expect(result.success).toBe(false)
		})

		it('accepts optional fields', () => {
			const validAgent = {
				name: 'Test Agent',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				instructions: 'You are a helpful assistant.',
				description: 'A test agent',
				config: { temperature: 0.7 },
				toolIds: ['tool_1', 'tool_2'],
			}
			const result = CreateAgentSchema.safeParse(validAgent)
			expect(result.success).toBe(true)
		})
	})

	describe('AgentConfigSchema', () => {
		it('validates valid config', () => {
			const validConfig = {
				temperature: 0.7,
				maxTokens: 4096,
				topP: 0.9,
			}
			const result = AgentConfigSchema.safeParse(validConfig)
			expect(result.success).toBe(true)
		})

		it('rejects temperature below 0', () => {
			const invalidConfig = { temperature: -0.1 }
			const result = AgentConfigSchema.safeParse(invalidConfig)
			expect(result.success).toBe(false)
		})

		it('rejects temperature above 2', () => {
			const invalidConfig = { temperature: 2.1 }
			const result = AgentConfigSchema.safeParse(invalidConfig)
			expect(result.success).toBe(false)
		})

		it('rejects maxTokens below 1', () => {
			const invalidConfig = { maxTokens: 0 }
			const result = AgentConfigSchema.safeParse(invalidConfig)
			expect(result.success).toBe(false)
		})

		it('accepts empty config object', () => {
			const result = AgentConfigSchema.safeParse({})
			expect(result.success).toBe(true)
		})
	})

	describe('AgentStatusSchema', () => {
		it('accepts valid statuses', () => {
			expect(AgentStatusSchema.safeParse('draft').success).toBe(true)
			expect(AgentStatusSchema.safeParse('deployed').success).toBe(true)
			expect(AgentStatusSchema.safeParse('archived').success).toBe(true)
		})

		it('rejects invalid status', () => {
			expect(AgentStatusSchema.safeParse('invalid').success).toBe(false)
			expect(AgentStatusSchema.safeParse('active').success).toBe(false)
		})
	})

	describe('CreateWorkspaceSchema', () => {
		it('validates a valid workspace creation request', () => {
			const validWorkspace = {
				name: 'My Workspace',
			}
			const result = CreateWorkspaceSchema.safeParse(validWorkspace)
			expect(result.success).toBe(true)
		})

		it('accepts optional description', () => {
			const validWorkspace = {
				name: 'My Workspace',
				description: 'A test workspace',
			}
			const result = CreateWorkspaceSchema.safeParse(validWorkspace)
			expect(result.success).toBe(true)
		})

		it('rejects empty name', () => {
			const invalidWorkspace = { name: '' }
			const result = CreateWorkspaceSchema.safeParse(invalidWorkspace)
			expect(result.success).toBe(false)
		})

		it('rejects name longer than 100 characters', () => {
			const invalidWorkspace = { name: 'a'.repeat(101) }
			const result = CreateWorkspaceSchema.safeParse(invalidWorkspace)
			expect(result.success).toBe(false)
		})
	})

	describe('WorkspaceRoleSchema', () => {
		it('accepts valid roles', () => {
			expect(WorkspaceRoleSchema.safeParse('owner').success).toBe(true)
			expect(WorkspaceRoleSchema.safeParse('admin').success).toBe(true)
			expect(WorkspaceRoleSchema.safeParse('member').success).toBe(true)
			expect(WorkspaceRoleSchema.safeParse('viewer').success).toBe(true)
		})

		it('rejects invalid roles', () => {
			expect(WorkspaceRoleSchema.safeParse('superadmin').success).toBe(false)
			expect(WorkspaceRoleSchema.safeParse('guest').success).toBe(false)
		})
	})

	describe('CreateToolSchema', () => {
		it('validates a valid tool creation request', () => {
			const validTool = {
				name: 'My Tool',
				description: 'A custom tool',
				type: 'http',
				inputSchema: { url: { type: 'string' } },
			}
			const result = CreateToolSchema.safeParse(validTool)
			expect(result.success).toBe(true)
		})

		it('rejects empty name', () => {
			const invalidTool = {
				name: '',
				description: 'A custom tool',
				type: 'http',
				inputSchema: {},
			}
			const result = CreateToolSchema.safeParse(invalidTool)
			expect(result.success).toBe(false)
		})

		it('rejects empty description', () => {
			const invalidTool = {
				name: 'My Tool',
				description: '',
				type: 'http',
				inputSchema: {},
			}
			const result = CreateToolSchema.safeParse(invalidTool)
			expect(result.success).toBe(false)
		})
	})

	describe('ToolTypeSchema', () => {
		it('accepts valid tool types', () => {
			expect(ToolTypeSchema.safeParse('http').success).toBe(true)
			expect(ToolTypeSchema.safeParse('sql').success).toBe(true)
			expect(ToolTypeSchema.safeParse('kv').success).toBe(true)
			expect(ToolTypeSchema.safeParse('r2').success).toBe(true)
			expect(ToolTypeSchema.safeParse('custom').success).toBe(true)
			expect(ToolTypeSchema.safeParse('webhook').success).toBe(true)
		})

		it('rejects invalid tool types', () => {
			expect(ToolTypeSchema.safeParse('invalid_type').success).toBe(false)
			expect(ToolTypeSchema.safeParse('api').success).toBe(false)
		})
	})

	describe('SignUpSchema', () => {
		it('validates a valid sign up request', () => {
			const validSignUp = {
				email: 'user@example.com',
				password: 'password123',
				name: 'John Doe',
			}
			const result = SignUpSchema.safeParse(validSignUp)
			expect(result.success).toBe(true)
		})

		it('rejects invalid email', () => {
			const invalidSignUp = {
				email: 'not-an-email',
				password: 'password123',
				name: 'John Doe',
			}
			const result = SignUpSchema.safeParse(invalidSignUp)
			expect(result.success).toBe(false)
		})

		it('rejects password shorter than 8 characters', () => {
			const invalidSignUp = {
				email: 'user@example.com',
				password: 'short',
				name: 'John Doe',
			}
			const result = SignUpSchema.safeParse(invalidSignUp)
			expect(result.success).toBe(false)
		})

		it('rejects empty name', () => {
			const invalidSignUp = {
				email: 'user@example.com',
				password: 'password123',
				name: '',
			}
			const result = SignUpSchema.safeParse(invalidSignUp)
			expect(result.success).toBe(false)
		})
	})

	describe('SignInSchema', () => {
		it('validates a valid sign in request', () => {
			const validSignIn = {
				email: 'user@example.com',
				password: 'password123',
			}
			const result = SignInSchema.safeParse(validSignIn)
			expect(result.success).toBe(true)
		})

		it('rejects invalid email', () => {
			const invalidSignIn = {
				email: 'not-an-email',
				password: 'password123',
			}
			const result = SignInSchema.safeParse(invalidSignIn)
			expect(result.success).toBe(false)
		})

		it('rejects empty password', () => {
			const invalidSignIn = {
				email: 'user@example.com',
				password: '',
			}
			const result = SignInSchema.safeParse(invalidSignIn)
			expect(result.success).toBe(false)
		})
	})

	describe('ChatRequestSchema', () => {
		it('validates a valid chat request', () => {
			const validRequest = {
				message: 'Hello, how are you?',
			}
			const result = ChatRequestSchema.safeParse(validRequest)
			expect(result.success).toBe(true)
		})

		it('accepts optional sessionId', () => {
			const validRequest = {
				message: 'Hello',
				sessionId: 'session_123',
			}
			const result = ChatRequestSchema.safeParse(validRequest)
			expect(result.success).toBe(true)
		})

		it('accepts optional metadata', () => {
			const validRequest = {
				message: 'Hello',
				metadata: { userId: 'user_123' },
			}
			const result = ChatRequestSchema.safeParse(validRequest)
			expect(result.success).toBe(true)
		})

		it('rejects empty message', () => {
			const invalidRequest = { message: '' }
			const result = ChatRequestSchema.safeParse(invalidRequest)
			expect(result.success).toBe(false)
		})
	})
})
