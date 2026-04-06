import { describe, expect, it } from 'vitest'
import { cn } from '../utils'

describe('cn utility', () => {
	it('merges class names', () => {
		expect(cn('foo', 'bar')).toBe('foo bar')
	})

	it('handles undefined values', () => {
		expect(cn('foo', undefined, 'bar')).toBe('foo bar')
	})

	it('handles null values', () => {
		expect(cn('foo', null, 'bar')).toBe('foo bar')
	})

	it('handles boolean conditionals', () => {
		expect(cn('foo', false && 'hidden', 'bar')).toBe('foo bar')
		expect(cn('foo', true && 'visible', 'bar')).toBe('foo visible bar')
	})

	it('merges tailwind classes correctly', () => {
		// Later classes should override earlier ones for conflicting utilities
		expect(cn('px-2', 'px-4')).toBe('px-4')
		expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
	})

	it('preserves non-conflicting tailwind classes', () => {
		expect(cn('px-2', 'py-4')).toBe('px-2 py-4')
		expect(cn('text-lg', 'font-bold')).toBe('text-lg font-bold')
	})

	it('handles complex class combinations', () => {
		const result = cn(
			'base-class',
			'flex items-center',
			{ 'bg-red-500': true, 'bg-blue-500': false },
			['px-2', 'py-2'],
		)
		expect(result).toContain('base-class')
		expect(result).toContain('flex')
		expect(result).toContain('items-center')
		expect(result).toContain('bg-red-500')
		expect(result).not.toContain('bg-blue-500')
		expect(result).toContain('px-2')
		expect(result).toContain('py-2')
	})

	it('returns empty string for no inputs', () => {
		expect(cn()).toBe('')
	})

	it('returns empty string for all falsy inputs', () => {
		expect(cn(undefined, null, false)).toBe('')
	})
})
