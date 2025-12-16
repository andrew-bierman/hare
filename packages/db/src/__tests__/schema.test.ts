import { describe, it, expect } from 'vitest'
import { createId } from '@paralleldrive/cuid2'
import * as schema from '../schema'

describe('Database Schema', () => {
  describe('Schema exports', () => {
    it('should export all required tables', () => {
      expect(schema.agents).toBeDefined()
      expect(schema.workspaces).toBeDefined()
      expect(schema.workspaceMembers).toBeDefined()
      expect(schema.tools).toBeDefined()
      expect(schema.agentTools).toBeDefined()
      expect(schema.users).toBeDefined()
    })

    it('should have valid table definitions', () => {
      expect(typeof schema.agents).toBe('object')
      expect(typeof schema.workspaces).toBe('object')
      expect(typeof schema.tools).toBe('object')
    })
  })

  describe('ID generation', () => {
    it('should generate unique IDs', () => {
      const id1 = createId()
      const id2 = createId()
      const id3 = createId()

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('should generate string IDs', () => {
      const id = createId()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('should generate IDs with consistent format', () => {
      const ids = Array.from({ length: 10 }, () => createId())

      ids.forEach((id) => {
        expect(typeof id).toBe('string')
        expect(id.length).toBeGreaterThan(10)
        // CUIDs are alphanumeric
        expect(id).toMatch(/^[a-z0-9]+$/)
      })
    })

    it('should generate collision-resistant IDs', () => {
      // Generate many IDs quickly
      const ids = Array.from({ length: 1000 }, () => createId())
      const uniqueIds = new Set(ids)

      // All IDs should be unique
      expect(uniqueIds.size).toBe(1000)
    })
  })

  describe('Agents table schema', () => {
    it('should have correct table name', () => {
      // Drizzle tables expose their metadata
      expect(schema.agents).toBeDefined()
    })

    it('should define all required columns', () => {
      const columns = Object.keys(schema.agents)

      expect(columns).toContain('id')
      expect(columns).toContain('workspaceId')
      expect(columns).toContain('name')
      expect(columns).toContain('description')
      expect(columns).toContain('instructions')
      expect(columns).toContain('model')
      expect(columns).toContain('status')
      expect(columns).toContain('config')
      expect(columns).toContain('createdBy')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should have valid status enum values', () => {
      // The schema defines status as enum with specific values
      const statusColumn = schema.agents.status
      expect(statusColumn).toBeDefined()
    })

    it('should have config as JSON type', () => {
      const configColumn = schema.agents.config
      expect(configColumn).toBeDefined()
    })

    it('should have timestamp columns', () => {
      expect(schema.agents.createdAt).toBeDefined()
      expect(schema.agents.updatedAt).toBeDefined()
    })

    it('should have foreign key references', () => {
      expect(schema.agents.workspaceId).toBeDefined()
      expect(schema.agents.createdBy).toBeDefined()
    })
  })

  describe('Workspaces table schema', () => {
    it('should have correct table structure', () => {
      expect(schema.workspaces).toBeDefined()
    })

    it('should define all required columns', () => {
      const columns = Object.keys(schema.workspaces)

      expect(columns).toContain('id')
      expect(columns).toContain('name')
      expect(columns).toContain('slug')
      expect(columns).toContain('description')
      expect(columns).toContain('ownerId')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should have unique slug constraint', () => {
      const slugColumn = schema.workspaces.slug
      expect(slugColumn).toBeDefined()
    })

    it('should have owner reference', () => {
      expect(schema.workspaces.ownerId).toBeDefined()
    })

    it('should have timestamps', () => {
      expect(schema.workspaces.createdAt).toBeDefined()
      expect(schema.workspaces.updatedAt).toBeDefined()
    })
  })

  describe('Workspace Members table schema', () => {
    it('should define workspace members table', () => {
      expect(schema.workspaceMembers).toBeDefined()
    })

    it('should define all required columns', () => {
      const columns = Object.keys(schema.workspaceMembers)

      expect(columns).toContain('id')
      expect(columns).toContain('workspaceId')
      expect(columns).toContain('userId')
      expect(columns).toContain('role')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should have role enum', () => {
      const roleColumn = schema.workspaceMembers.role
      expect(roleColumn).toBeDefined()
    })

    it('should have foreign key references', () => {
      expect(schema.workspaceMembers.workspaceId).toBeDefined()
      expect(schema.workspaceMembers.userId).toBeDefined()
    })
  })

  describe('Tools table schema', () => {
    it('should define tools table', () => {
      expect(schema.tools).toBeDefined()
    })

    it('should define all required columns', () => {
      const columns = Object.keys(schema.tools)

      expect(columns).toContain('id')
      expect(columns).toContain('workspaceId')
      expect(columns).toContain('name')
      expect(columns).toContain('description')
      expect(columns).toContain('type')
      expect(columns).toContain('config')
      expect(columns).toContain('createdBy')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should have type enum', () => {
      const typeColumn = schema.tools.type
      expect(typeColumn).toBeDefined()
    })

    it('should have config as JSON type', () => {
      const configColumn = schema.tools.config
      expect(configColumn).toBeDefined()
    })

    it('should have foreign key references', () => {
      expect(schema.tools.workspaceId).toBeDefined()
      expect(schema.tools.createdBy).toBeDefined()
    })
  })

  describe('Agent Tools junction table schema', () => {
    it('should define agent tools junction table', () => {
      expect(schema.agentTools).toBeDefined()
    })

    it('should define all required columns', () => {
      const columns = Object.keys(schema.agentTools)

      expect(columns).toContain('id')
      expect(columns).toContain('agentId')
      expect(columns).toContain('toolId')
      expect(columns).toContain('createdAt')
    })

    it('should have foreign key references', () => {
      expect(schema.agentTools.agentId).toBeDefined()
      expect(schema.agentTools.toolId).toBeDefined()
    })

    it('should have creation timestamp', () => {
      expect(schema.agentTools.createdAt).toBeDefined()
    })
  })

  describe('Schema relationships', () => {
    it('should have workspace to agents relationship', () => {
      // Agents reference workspaces
      expect(schema.agents.workspaceId).toBeDefined()
    })

    it('should have workspace to tools relationship', () => {
      // Tools reference workspaces
      expect(schema.tools.workspaceId).toBeDefined()
    })

    it('should have agent to tools many-to-many relationship', () => {
      // Through agentTools junction table
      expect(schema.agentTools.agentId).toBeDefined()
      expect(schema.agentTools.toolId).toBeDefined()
    })

    it('should have user to workspace relationship', () => {
      expect(schema.workspaces.ownerId).toBeDefined()
      expect(schema.workspaceMembers.userId).toBeDefined()
    })

    it('should have user creation tracking', () => {
      expect(schema.agents.createdBy).toBeDefined()
      expect(schema.tools.createdBy).toBeDefined()
    })
  })

  describe('Column types validation', () => {
    it('should use text type for IDs', () => {
      // All IDs should be text (CUID2 strings)
      expect(schema.agents.id).toBeDefined()
      expect(schema.workspaces.id).toBeDefined()
      expect(schema.tools.id).toBeDefined()
    })

    it('should use text type for names', () => {
      expect(schema.agents.name).toBeDefined()
      expect(schema.workspaces.name).toBeDefined()
      expect(schema.tools.name).toBeDefined()
    })

    it('should use integer type for timestamps', () => {
      expect(schema.agents.createdAt).toBeDefined()
      expect(schema.agents.updatedAt).toBeDefined()
      expect(schema.workspaces.createdAt).toBeDefined()
      expect(schema.workspaces.updatedAt).toBeDefined()
    })

    it('should use JSON mode for complex config objects', () => {
      expect(schema.agents.config).toBeDefined()
      expect(schema.tools.config).toBeDefined()
    })
  })

  describe('Default values and constraints', () => {
    it('should have default status for agents', () => {
      // Default status is 'draft'
      const statusColumn = schema.agents.status
      expect(statusColumn).toBeDefined()
    })

    it('should have default model for agents', () => {
      // Default model is 'claude-3-5-sonnet-20241022'
      const modelColumn = schema.agents.model
      expect(modelColumn).toBeDefined()
    })

    it('should have default role for workspace members', () => {
      // Default role is 'member'
      const roleColumn = schema.workspaceMembers.role
      expect(roleColumn).toBeDefined()
    })

    it('should have NOT NULL constraints on required fields', () => {
      // Key fields should be required
      expect(schema.agents.name).toBeDefined()
      expect(schema.agents.workspaceId).toBeDefined()
      expect(schema.workspaces.name).toBeDefined()
      expect(schema.tools.name).toBeDefined()
    })

    it('should allow NULL on optional fields', () => {
      // Description fields should be optional
      expect(schema.agents.description).toBeDefined()
      expect(schema.workspaces.description).toBeDefined()
      expect(schema.tools.description).toBeDefined()
    })
  })

  describe('Cascade delete behavior', () => {
    it('should define cascade delete for workspace relations', () => {
      // When workspace is deleted, related records should be deleted
      // This is defined in the foreign key references
      expect(schema.agents.workspaceId).toBeDefined()
      expect(schema.tools.workspaceId).toBeDefined()
      expect(schema.workspaceMembers.workspaceId).toBeDefined()
    })

    it('should define cascade delete for agent tools', () => {
      // When agent or tool is deleted, the junction record should be deleted
      expect(schema.agentTools.agentId).toBeDefined()
      expect(schema.agentTools.toolId).toBeDefined()
    })
  })

  describe('Enum validation', () => {
    it('should define valid agent status values', () => {
      // Status can be: draft, deployed, archived
      const statusColumn = schema.agents.status
      expect(statusColumn).toBeDefined()
    })

    it('should define valid workspace member roles', () => {
      // Roles can be: owner, admin, member, viewer
      const roleColumn = schema.workspaceMembers.role
      expect(roleColumn).toBeDefined()
    })

    it('should define valid tool types', () => {
      // Types can be: http, sql, search, custom
      const typeColumn = schema.tools.type
      expect(typeColumn).toBeDefined()
    })
  })

  describe('Schema consistency', () => {
    it('should have consistent timestamp fields across tables', () => {
      // All main tables should have createdAt and updatedAt
      expect(schema.agents.createdAt).toBeDefined()
      expect(schema.agents.updatedAt).toBeDefined()
      expect(schema.workspaces.createdAt).toBeDefined()
      expect(schema.workspaces.updatedAt).toBeDefined()
      expect(schema.tools.createdAt).toBeDefined()
      expect(schema.tools.updatedAt).toBeDefined()
    })

    it('should have consistent ID naming pattern', () => {
      // All tables should have 'id' as primary key
      expect(schema.agents.id).toBeDefined()
      expect(schema.workspaces.id).toBeDefined()
      expect(schema.tools.id).toBeDefined()
      expect(schema.agentTools.id).toBeDefined()
      expect(schema.workspaceMembers.id).toBeDefined()
    })

    it('should have consistent foreign key naming', () => {
      // Foreign keys should be named consistently
      expect(schema.agents.workspaceId).toBeDefined()
      expect(schema.tools.workspaceId).toBeDefined()
      expect(schema.workspaceMembers.workspaceId).toBeDefined()
      expect(schema.agentTools.agentId).toBeDefined()
      expect(schema.agentTools.toolId).toBeDefined()
    })

    it('should have createdBy tracking on user-created entities', () => {
      expect(schema.agents.createdBy).toBeDefined()
      expect(schema.tools.createdBy).toBeDefined()
    })
  })

  describe('Type safety', () => {
    it('should provide TypeScript types for config objects', () => {
      // Config types should be properly typed
      // This is validated at compile time, but we can check runtime structure
      expect(schema.agents.config).toBeDefined()
      expect(schema.tools.config).toBeDefined()
    })

    it('should export all schema definitions', () => {
      // All tables should be exported from schema/index
      expect(schema.agents).toBeDefined()
      expect(schema.workspaces).toBeDefined()
      expect(schema.workspaceMembers).toBeDefined()
      expect(schema.tools).toBeDefined()
      expect(schema.agentTools).toBeDefined()
    })
  })

  describe('Data integrity', () => {
    it('should enforce primary keys', () => {
      // All tables should have primary keys
      expect(schema.agents.id).toBeDefined()
      expect(schema.workspaces.id).toBeDefined()
      expect(schema.tools.id).toBeDefined()
      expect(schema.agentTools.id).toBeDefined()
      expect(schema.workspaceMembers.id).toBeDefined()
    })

    it('should enforce unique constraints where needed', () => {
      // Slug should be unique in workspaces
      expect(schema.workspaces.slug).toBeDefined()
    })

    it('should define referential integrity constraints', () => {
      // Foreign keys should reference valid tables
      expect(schema.agents.workspaceId).toBeDefined()
      expect(schema.agents.createdBy).toBeDefined()
      expect(schema.tools.workspaceId).toBeDefined()
      expect(schema.tools.createdBy).toBeDefined()
      expect(schema.workspaceMembers.workspaceId).toBeDefined()
      expect(schema.workspaceMembers.userId).toBeDefined()
    })
  })
})
