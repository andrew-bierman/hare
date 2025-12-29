import { describe, it, expect } from 'vitest'
import { nameToSlug, generateUniqueSlug } from '@hare/utils'

describe('nameToSlug', () => {
	it('converts name to lowercase', () => {
		expect(nameToSlug('My Workspace')).toBe('my-workspace')
	})

	it('replaces spaces with hyphens', () => {
		expect(nameToSlug('hello world')).toBe('hello-world')
	})

	it('removes special characters', () => {
		expect(nameToSlug('Test 123!')).toBe('test-123')
		expect(nameToSlug("Hello@World#2024")).toBe('helloworld2024')
	})

	it('handles multiple consecutive spaces', () => {
		expect(nameToSlug('hello   world')).toBe('hello-world')
	})

	it('handles empty string', () => {
		expect(nameToSlug('')).toBe('')
	})
})

describe('generateUniqueSlug', () => {
	it('returns base slug when no conflicts exist', async () => {
		const checkExists = async () => false
		const slug = await generateUniqueSlug('My Workspace', checkExists)
		expect(slug).toBe('my-workspace')
	})

	it('appends counter when slug exists', async () => {
		const existingSlugs = new Set(['my-workspace'])
		const checkExists = async (slug: string) => existingSlugs.has(slug)
		const slug = await generateUniqueSlug('My Workspace', checkExists)
		expect(slug).toBe('my-workspace-1')
	})

	it('increments counter until unique slug is found', async () => {
		const existingSlugs = new Set(['my-workspace', 'my-workspace-1', 'my-workspace-2'])
		const checkExists = async (slug: string) => existingSlugs.has(slug)
		const slug = await generateUniqueSlug('My Workspace', checkExists)
		expect(slug).toBe('my-workspace-3')
	})

	it('handles async check function correctly', async () => {
		let callCount = 0
		const checkExists = async (slug: string) => {
			callCount++
			// Simulate async operation
			await Promise.resolve()
			return callCount < 3
		}
		const slug = await generateUniqueSlug('Test', checkExists)
		expect(slug).toBe('test-2')
		expect(callCount).toBe(3)
	})
})
