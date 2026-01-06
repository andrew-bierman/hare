/**
 * Tests for edge-agent.ts - HareEdgeAgent class
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { HareEdgeAgent, createHareEdgeAgent, type AgentTool } from '../edge-agent'

// Mock the workers-ai provider
vi.mock('../providers/workers-ai', () => ({
	createWorkersAIModel: vi.fn().mockReturnValue({
		// Mock LanguageModel interface
		specificationVersion: 'v1',
		provider: 'workers-ai',
		modelId: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	}),
}))

// Mock the AI SDK streamText
vi.mock('ai', () => ({
	streamText: vi.fn().mockImplementation(async () => ({
		textStream: (async function* () {
			yield 'Hello '
			yield 'world!'
		})(),
		text: Promise.resolve('Hello world!'),
	})),
}))

/**
 * Create a mock Ai binding for testing.
 */
function createMockAi(): Ai {
	return {
		run: vi.fn().mockResolvedValue({ response: 'mocked response' }),
	} as unknown as Ai
}

describe('HareEdgeAgent', () => {
	let mockAi: Ai

	beforeEach(() => {
		mockAi = createMockAi()
		vi.clearAllMocks()
	})

	describe('constructor', () => {
		it('creates an agent with basic options', () => {
			const agent = new HareEdgeAgent({
				name: 'Test Agent',
				instructions: 'You are a helpful assistant.',
				model: 'llama-3.3-70b',
				ai: mockAi,
			})

			expect(agent.name).toBe('Test Agent')
			expect(agent.instructions).toBe('You are a helpful assistant.')
			expect(agent.tools.size).toBe(0)
		})

		it('creates an agent with tools', () => {
			const testTool: AgentTool = {
				id: 'test_tool',
				description: 'A test tool',
				inputSchema: { query: { type: 'string' } },
				execute: vi.fn(),
			}

			const agent = new HareEdgeAgent({
				name: 'Test Agent',
				instructions: 'You are a helpful assistant.',
				model: 'llama-3.3-70b',
				ai: mockAi,
				tools: [testTool],
			})

			expect(agent.tools.size).toBe(1)
			expect(agent.tools.has('test_tool')).toBe(true)
		})

		it('registers multiple tools', () => {
			const tools: AgentTool[] = [
				{ id: 'tool_1', description: 'First tool', inputSchema: {}, execute: vi.fn() },
				{ id: 'tool_2', description: 'Second tool', inputSchema: {}, execute: vi.fn() },
				{ id: 'tool_3', description: 'Third tool', inputSchema: {}, execute: vi.fn() },
			]

			const agent = new HareEdgeAgent({
				name: 'Multi-tool Agent',
				instructions: 'Agent with multiple tools',
				model: 'llama-3.3-70b',
				ai: mockAi,
				tools,
			})

			expect(agent.tools.size).toBe(3)
			for (const tool of tools) {
				expect(agent.tools.has(tool.id)).toBe(true)
			}
		})
	})

	describe('stream', () => {
		it('streams text responses', async () => {
			const agent = new HareEdgeAgent({
				name: 'Test Agent',
				instructions: 'You are a helpful assistant.',
				model: 'llama-3.3-70b',
				ai: mockAi,
			})

			const messages = [{ role: 'user' as const, content: 'Hello!' }]
			const response = await agent.stream(messages)

			const chunks: string[] = []
			for await (const chunk of response.textStream) {
				chunks.push(chunk)
			}

			expect(chunks).toEqual(['Hello ', 'world!'])
		})

		it('provides full text via promise', async () => {
			const agent = new HareEdgeAgent({
				name: 'Test Agent',
				instructions: 'You are a helpful assistant.',
				model: 'llama-3.3-70b',
				ai: mockAi,
			})

			const messages = [{ role: 'user' as const, content: 'Hello!' }]
			const response = await agent.stream(messages)

			const fullText = await response.text
			expect(fullText).toBe('Hello world!')
		})
	})

	describe('generate', () => {
		it('returns complete text response', async () => {
			const agent = new HareEdgeAgent({
				name: 'Test Agent',
				instructions: 'You are a helpful assistant.',
				model: 'llama-3.3-70b',
				ai: mockAi,
			})

			const messages = [{ role: 'user' as const, content: 'Hello!' }]
			const text = await agent.generate(messages)

			expect(text).toBe('Hello world!')
		})
	})

	describe('streamRaw', () => {
		it('returns raw AI SDK stream result', async () => {
			const agent = new HareEdgeAgent({
				name: 'Test Agent',
				instructions: 'You are a helpful assistant.',
				model: 'llama-3.3-70b',
				ai: mockAi,
			})

			const messages = [{ role: 'user' as const, content: 'Hello!' }]
			const result = agent.streamRaw(messages)

			// streamRaw returns the raw streamText result
			expect(result).toBeDefined()
		})
	})

	describe('system prompt building', () => {
		it('builds system prompt without tools', () => {
			const agent = new HareEdgeAgent({
				name: 'Test Agent',
				instructions: 'You are a helpful assistant.',
				model: 'llama-3.3-70b',
				ai: mockAi,
			})

			// Access private method via type assertion for testing
			const buildSystemPrompt = (agent as unknown as { buildSystemPrompt: () => string })
				.buildSystemPrompt
			const prompt = buildSystemPrompt.call(agent)

			expect(prompt).toBe('You are a helpful assistant.')
		})

		it('builds system prompt with tools', () => {
			const tools: AgentTool[] = [
				{ id: 'search', description: 'Search the web', inputSchema: {}, execute: vi.fn() },
				{
					id: 'calculator',
					description: 'Perform calculations',
					inputSchema: {},
					execute: vi.fn(),
				},
			]

			const agent = new HareEdgeAgent({
				name: 'Test Agent',
				instructions: 'You are a helpful assistant.',
				model: 'llama-3.3-70b',
				ai: mockAi,
				tools,
			})

			const buildSystemPrompt = (agent as unknown as { buildSystemPrompt: () => string })
				.buildSystemPrompt
			const prompt = buildSystemPrompt.call(agent)

			expect(prompt).toContain('You are a helpful assistant.')
			expect(prompt).toContain('## Available Tools')
			expect(prompt).toContain('**search**: Search the web')
			expect(prompt).toContain('**calculator**: Perform calculations')
		})
	})
})

describe('createHareEdgeAgent', () => {
	it('creates a HareEdgeAgent instance', () => {
		const agent = createHareEdgeAgent({
			name: 'Factory Agent',
			instructions: 'Created via factory function.',
			model: 'llama-3.3-70b',
			ai: createMockAi(),
		})

		expect(agent).toBeInstanceOf(HareEdgeAgent)
		expect(agent.name).toBe('Factory Agent')
	})
})
