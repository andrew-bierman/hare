import { describe, expect, it } from 'vitest'
import { hasPermission } from '../workspace'

describe('hasPermission', () => {
describe('owner role', () => {
it('has read permission', () => {
expect(hasPermission('owner', 'read')).toBe(true)
})

it('has write permission', () => {
expect(hasPermission('owner', 'write')).toBe(true)
})

it('has admin permission', () => {
expect(hasPermission('owner', 'admin')).toBe(true)
})

it('has owner permission', () => {
expect(hasPermission('owner', 'owner')).toBe(true)
})
})

describe('admin role', () => {
it('has read permission', () => {
expect(hasPermission('admin', 'read')).toBe(true)
})

it('has write permission', () => {
expect(hasPermission('admin', 'write')).toBe(true)
})

it('has admin permission', () => {
expect(hasPermission('admin', 'admin')).toBe(true)
})

it('does not have owner permission', () => {
expect(hasPermission('admin', 'owner')).toBe(false)
})
})

describe('member role', () => {
it('has read permission', () => {
expect(hasPermission('member', 'read')).toBe(true)
})

it('has write permission', () => {
expect(hasPermission('member', 'write')).toBe(true)
})

it('does not have admin permission', () => {
expect(hasPermission('member', 'admin')).toBe(false)
})

it('does not have owner permission', () => {
expect(hasPermission('member', 'owner')).toBe(false)
})
})

describe('viewer role', () => {
it('has read permission', () => {
expect(hasPermission('viewer', 'read')).toBe(true)
})

it('does not have write permission', () => {
expect(hasPermission('viewer', 'write')).toBe(false)
})

it('does not have admin permission', () => {
expect(hasPermission('viewer', 'admin')).toBe(false)
})

it('does not have owner permission', () => {
expect(hasPermission('viewer', 'owner')).toBe(false)
})
})
})
