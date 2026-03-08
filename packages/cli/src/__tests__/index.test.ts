/**
 * Tests for @hare/cli - Template verification and init logic
 */

import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../templates'

describe('@hare/cli', () => {
	describe('TEMPLATES', () => {
		it('generates valid package.json with the project name', () => {
			const content = TEMPLATES['package.json']('my-agent')
			const parsed = JSON.parse(content)
			expect(parsed.name).toBe('my-agent')
			expect(parsed.version).toMatch(/^\d+\.\d+\.\d+/)
			expect(parsed.private).toBe(true)
			expect(parsed.type).toBe('module')
			expect(parsed.scripts.dev).toBeTruthy()
			expect(parsed.scripts.deploy).toBeTruthy()
			expect(parsed.dependencies).toBeDefined()
		})

		it('generates wrangler.toml with the project name', () => {
			const content = TEMPLATES['wrangler.toml']('test-project')
			expect(content).toContain('name = "test-project"')
			expect(content).toContain('main = "src/index.ts"')
		})

		it('generates valid tsconfig.json', () => {
			const content = TEMPLATES['tsconfig.json']('any-name')
			const parsed = JSON.parse(content)
			expect(parsed.compilerOptions).toBeDefined()
			expect(parsed.compilerOptions.target).toBeTruthy()
		})

		it('includes all expected template files', () => {
			const templateKeys = Object.keys(TEMPLATES)
			expect(templateKeys).toContain('package.json')
			expect(templateKeys).toContain('wrangler.toml')
			expect(templateKeys).toContain('tsconfig.json')
			expect(templateKeys).toContain('src/index.ts')
			expect(templateKeys).toContain('README.md')
		})

		it('all templates are functions', () => {
			for (const [name, template] of Object.entries(TEMPLATES)) {
				expect(typeof template, `${name} template should be a function`).toBe('function')
			}
		})

		it('all templates return non-empty strings', () => {
			for (const [name, template] of Object.entries(TEMPLATES)) {
				const result = template('test-project')
				expect(typeof result, `${name} should return a string`).toBe('string')
				expect(result.length, `${name} should return non-empty content`).toBeGreaterThan(0)
			}
		})
	})

	describe('project name handling', () => {
		it('handles simple project names', () => {
			const content = TEMPLATES['package.json']('my-agent')
			expect(JSON.parse(content).name).toBe('my-agent')
		})

		it('handles scoped package names', () => {
			const content = TEMPLATES['package.json']('@company/my-agent')
			expect(JSON.parse(content).name).toBe('@company/my-agent')
		})

		it('handles single-word names', () => {
			const content = TEMPLATES['package.json']('agent')
			expect(JSON.parse(content).name).toBe('agent')
		})
	})
})
