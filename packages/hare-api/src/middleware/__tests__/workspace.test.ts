import { describe, expect, it } from 'vitest'
import { hasPermission } from '../workspace'

describe('hasPermission', () => {
	describe('owner role', () => {
		it('has read permission', () => {
			expect(hasPermission({ role: 'owner', action: 'read' })).toBe(true)
		})

		it('has write permission', () => {
			expect(hasPermission({ role: 'owner', action: 'write' })).toBe(true)
		})

		it('has admin permission', () => {
			expect(hasPermission({ role: 'owner', action: 'admin' })).toBe(true)
		})

		it('has owner permission', () => {
			expect(hasPermission({ role: 'owner', action: 'owner' })).toBe(true)
		})
	})

	describe('admin role', () => {
		it('has read permission', () => {
			expect(hasPermission({ role: 'admin', action: 'read' })).toBe(true)
		})

		it('has write permission', () => {
			expect(hasPermission({ role: 'admin', action: 'write' })).toBe(true)
		})

		it('has admin permission', () => {
			expect(hasPermission({ role: 'admin', action: 'admin' })).toBe(true)
		})

		it('does not have owner permission', () => {
			expect(hasPermission({ role: 'admin', action: 'owner' })).toBe(false)
		})
	})

	describe('member role', () => {
		it('has read permission', () => {
			expect(hasPermission({ role: 'member', action: 'read' })).toBe(true)
		})

		it('has write permission', () => {
			expect(hasPermission({ role: 'member', action: 'write' })).toBe(true)
		})

		it('does not have admin permission', () => {
			expect(hasPermission({ role: 'member', action: 'admin' })).toBe(false)
		})

		it('does not have owner permission', () => {
			expect(hasPermission({ role: 'member', action: 'owner' })).toBe(false)
		})
	})

	describe('viewer role', () => {
		it('has read permission', () => {
			expect(hasPermission({ role: 'viewer', action: 'read' })).toBe(true)
		})

		it('does not have write permission', () => {
			expect(hasPermission({ role: 'viewer', action: 'write' })).toBe(false)
		})

		it('does not have admin permission', () => {
			expect(hasPermission({ role: 'viewer', action: 'admin' })).toBe(false)
		})

		it('does not have owner permission', () => {
			expect(hasPermission({ role: 'viewer', action: 'owner' })).toBe(false)
		})
	})
})
