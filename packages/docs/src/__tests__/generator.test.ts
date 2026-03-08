/**
 * Tests for @hare/docs - Documentation generator and MDX generation
 */

import { describe, expect, it } from 'vitest'
import {
	generateInterfaceMDX,
	generateClassMDX,
	generateFunctionMDX,
	generateToolMDX,
	generatePackageMDX,
	extractDocsFromFile,
	type DocInterface,
	type DocClass,
	type DocFunction,
	type DocTool,
	type ExtractedDocs,
} from '../generator'

describe('@hare/docs exports', () => {
	it('exports generateInterfaceMDX', () => {
		expect(typeof generateInterfaceMDX).toBe('function')
	})

	it('exports generateClassMDX', () => {
		expect(typeof generateClassMDX).toBe('function')
	})

	it('exports generateFunctionMDX', () => {
		expect(typeof generateFunctionMDX).toBe('function')
	})

	it('exports generateToolMDX', () => {
		expect(typeof generateToolMDX).toBe('function')
	})

	it('exports generatePackageMDX', () => {
		expect(typeof generatePackageMDX).toBe('function')
	})

	it('exports extractDocsFromFile', () => {
		expect(typeof extractDocsFromFile).toBe('function')
	})
})

describe('generateInterfaceMDX', () => {
	it('generates MDX for an interface with properties', () => {
		const iface: DocInterface = {
			name: 'AgentConfig',
			description: 'Configuration for an agent',
			properties: [
				{ name: 'name', type: 'string', description: 'Agent name', optional: false },
				{ name: 'model', type: 'string', description: 'Model ID', optional: false },
				{ name: 'temperature', type: 'number', description: 'Sampling temperature', optional: true },
			],
		}

		const mdx = generateInterfaceMDX(iface)
		expect(mdx).toContain('### AgentConfig')
		expect(mdx).toContain('Configuration for an agent')
		expect(mdx).toContain('`name`')
		expect(mdx).toContain('`string`')
		expect(mdx).toContain('Agent name')
		expect(mdx).toContain('(optional)')
	})

	it('generates MDX for an interface with no description', () => {
		const iface: DocInterface = {
			name: 'EmptyInterface',
			description: '',
			properties: [],
		}

		const mdx = generateInterfaceMDX(iface)
		expect(mdx).toContain('### EmptyInterface')
	})

	it('includes example when provided', () => {
		const iface: DocInterface = {
			name: 'TestInterface',
			description: 'Test',
			properties: [],
			example: 'const x: TestInterface = {}',
		}

		const mdx = generateInterfaceMDX(iface)
		expect(mdx).toContain('**Example:**')
		expect(mdx).toContain('const x: TestInterface = {}')
	})

	it('escapes pipe characters in types', () => {
		const iface: DocInterface = {
			name: 'UnionType',
			description: '',
			properties: [
				{ name: 'value', type: 'string | number', description: '', optional: false },
			],
		}

		const mdx = generateInterfaceMDX(iface)
		expect(mdx).toContain('string \\| number')
	})
})

describe('generateClassMDX', () => {
	it('generates MDX for a class with methods and properties', () => {
		const cls: DocClass = {
			name: 'HareAgent',
			description: 'Main agent class',
			properties: [
				{ name: 'state', type: 'AgentState', description: 'Current state', optional: false },
			],
			methods: [
				{
					name: 'onStart',
					description: 'Called when agent starts',
					params: [],
					returnType: 'Promise<void>',
				},
				{
					name: 'chat',
					description: 'Send a message',
					params: [
						{ name: 'message', type: 'string', description: 'The message' },
					],
					returnType: 'Promise<string>',
				},
			],
		}

		const mdx = generateClassMDX(cls)
		expect(mdx).toContain('## HareAgent')
		expect(mdx).toContain('Main agent class')
		expect(mdx).toContain('### Properties')
		expect(mdx).toContain('`state`')
		expect(mdx).toContain('### Methods')
		expect(mdx).toContain('`onStart()')
		expect(mdx).toContain('`chat(message: string)')
	})

	it('generates MDX for an empty class', () => {
		const cls: DocClass = {
			name: 'EmptyClass',
			description: '',
			properties: [],
			methods: [],
		}

		const mdx = generateClassMDX(cls)
		expect(mdx).toContain('## EmptyClass')
		expect(mdx).not.toContain('### Properties')
		expect(mdx).not.toContain('### Methods')
	})
})

describe('generateFunctionMDX', () => {
	it('generates MDX for a function', () => {
		const fn: DocFunction = {
			name: 'createAgent',
			description: 'Creates a new agent',
			params: [
				{ name: 'config', type: 'AgentConfig', description: 'Agent configuration' },
			],
			returnType: 'Agent',
		}

		const mdx = generateFunctionMDX(fn)
		expect(mdx).toContain('`createAgent(config: AgentConfig): Agent`')
		expect(mdx).toContain('Creates a new agent')
	})

	it('includes example when provided', () => {
		const fn: DocFunction = {
			name: 'hello',
			description: 'Says hello',
			params: [],
			returnType: 'string',
			example: 'const greeting = hello()',
		}

		const mdx = generateFunctionMDX(fn)
		expect(mdx).toContain('**Example:**')
		expect(mdx).toContain('const greeting = hello()')
	})
})

describe('generateToolMDX', () => {
	it('generates MDX for a tool with parameters', () => {
		const tool: DocTool = {
			id: 'http_request',
			description: 'Make an HTTP request',
			inputSchema: [
				{ name: 'url', type: 'string', description: 'Target URL', optional: false },
				{ name: 'method', type: 'string', description: 'HTTP method', optional: true },
			],
		}

		const mdx = generateToolMDX(tool)
		expect(mdx).toContain('### http_request')
		expect(mdx).toContain('Make an HTTP request')
		expect(mdx).toContain('**Parameters:**')
		expect(mdx).toContain('`url`')
		expect(mdx).toContain('Target URL')
		expect(mdx).toContain('(optional)')
	})

	it('generates MDX for a tool with no parameters', () => {
		const tool: DocTool = {
			id: 'uuid_generate',
			description: 'Generate a UUID',
			inputSchema: [],
		}

		const mdx = generateToolMDX(tool)
		expect(mdx).toContain('### uuid_generate')
		expect(mdx).not.toContain('**Parameters:**')
	})
})

describe('generatePackageMDX', () => {
	it('generates complete MDX with frontmatter', () => {
		const docs: ExtractedDocs = {
			interfaces: [
				{ name: 'Config', description: 'Config type', properties: [] },
			],
			classes: [
				{ name: 'Agent', description: 'Agent class', properties: [], methods: [] },
			],
			functions: [
				{ name: 'createAgent', description: 'Factory', params: [], returnType: 'Agent' },
			],
			tools: [
				{ id: 'test_tool', description: 'A test tool', inputSchema: [] },
			],
		}

		const mdx = generatePackageMDX({
			title: 'Test API',
			description: 'Test description',
			docs,
		})

		expect(mdx).toContain('title: Test API')
		expect(mdx).toContain('description: Test description')
		expect(mdx).toContain('# Test API')
		expect(mdx).toContain('## Classes')
		expect(mdx).toContain('## Types')
		expect(mdx).toContain('## Functions')
		expect(mdx).toContain('## Tools')
	})

	it('omits empty sections', () => {
		const docs: ExtractedDocs = {
			interfaces: [],
			classes: [],
			functions: [
				{ name: 'helper', description: '', params: [], returnType: 'void' },
			],
			tools: [],
		}

		const mdx = generatePackageMDX({ docs })
		expect(mdx).not.toContain('## Classes')
		expect(mdx).not.toContain('## Types')
		expect(mdx).toContain('## Functions')
		expect(mdx).not.toContain('## Tools')
	})

	it('uses default title when none provided', () => {
		const docs: ExtractedDocs = {
			interfaces: [],
			classes: [],
			functions: [],
			tools: [],
		}

		const mdx = generatePackageMDX({ docs })
		expect(mdx).toContain('# API Reference')
	})
})

describe('extractDocsFromFile', () => {
	it('returns empty docs for a nonexistent file', () => {
		const docs = extractDocsFromFile('/nonexistent/file.ts')
		expect(docs.interfaces).toEqual([])
		expect(docs.classes).toEqual([])
		expect(docs.functions).toEqual([])
		expect(docs.tools).toEqual([])
	})
})
