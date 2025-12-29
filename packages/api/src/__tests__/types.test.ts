import { describe, expect, it } from 'vitest'
import { assertMessageRole, assertWorkspaceRole, isMessageRole, isWorkspaceRole } from '@hare/types'

describe('isWorkspaceRole', () => {
	it('returns true for valid workspace roles', () => {
		expect(isWorkspaceRole('owner')).toBe(true)
		expect(isWorkspaceRole('admin')).toBe(true)
		expect(isWorkspaceRole('member')).toBe(true)
		expect(isWorkspaceRole('viewer')).toBe(true)
	})

	it('returns false for invalid workspace roles', () => {
		expect(isWorkspaceRole('invalid')).toBe(false)
		expect(isWorkspaceRole('superadmin')).toBe(false)
		expect(isWorkspaceRole('guest')).toBe(false)
	})

	it('returns false for non-string values', () => {
		expect(isWorkspaceRole(123)).toBe(false)
		expect(isWorkspaceRole(null)).toBe(false)
		expect(isWorkspaceRole(undefined)).toBe(false)
		expect(isWorkspaceRole({})).toBe(false)
		expect(isWorkspaceRole([])).toBe(false)
	})

	it('returns false for empty string', () => {
		expect(isWorkspaceRole('')).toBe(false)
	})
})

describe('assertWorkspaceRole', () => {
	it('does not throw for valid workspace roles', () => {
		expect(() => assertWorkspaceRole('owner')).not.toThrow()
		expect(() => assertWorkspaceRole('admin')).not.toThrow()
		expect(() => assertWorkspaceRole('member')).not.toThrow()
		expect(() => assertWorkspaceRole('viewer')).not.toThrow()
	})

	it('throws for invalid workspace roles', () => {
		expect(() => assertWorkspaceRole('invalid')).toThrow('Invalid workspace role')
		expect(() => assertWorkspaceRole('superadmin')).toThrow('Invalid workspace role')
	})

	it('throws for non-string values', () => {
		expect(() => assertWorkspaceRole(123)).toThrow('Invalid workspace role')
		expect(() => assertWorkspaceRole(null)).toThrow('Invalid workspace role')
		expect(() => assertWorkspaceRole(undefined)).toThrow('Invalid workspace role')
	})
})

describe('isMessageRole', () => {
	it('returns true for valid message roles', () => {
		expect(isMessageRole('user')).toBe(true)
		expect(isMessageRole('assistant')).toBe(true)
		expect(isMessageRole('system')).toBe(true)
		expect(isMessageRole('tool')).toBe(true)
	})

	it('returns false for invalid message roles', () => {
		expect(isMessageRole('invalid')).toBe(false)
		expect(isMessageRole('admin')).toBe(false)
		expect(isMessageRole('bot')).toBe(false)
	})

	it('returns false for non-string values', () => {
		expect(isMessageRole(123)).toBe(false)
		expect(isMessageRole(null)).toBe(false)
		expect(isMessageRole(undefined)).toBe(false)
		expect(isMessageRole({})).toBe(false)
		expect(isMessageRole([])).toBe(false)
	})

	it('returns false for empty string', () => {
		expect(isMessageRole('')).toBe(false)
	})
})

describe('assertMessageRole', () => {
	it('does not throw for valid message roles', () => {
		expect(() => assertMessageRole('user')).not.toThrow()
		expect(() => assertMessageRole('assistant')).not.toThrow()
		expect(() => assertMessageRole('system')).not.toThrow()
		expect(() => assertMessageRole('tool')).not.toThrow()
	})

	it('throws for invalid message roles', () => {
		expect(() => assertMessageRole('invalid')).toThrow('Invalid message role')
		expect(() => assertMessageRole('admin')).toThrow('Invalid message role')
	})

	it('throws for non-string values', () => {
		expect(() => assertMessageRole(123)).toThrow('Invalid message role')
		expect(() => assertMessageRole(null)).toThrow('Invalid message role')
		expect(() => assertMessageRole(undefined)).toThrow('Invalid message role')
	})
})
