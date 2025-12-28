/**
 * Workspace Entity
 *
 * Business entity for workspaces.
 * Following Feature-Sliced Design, this is the public API for the workspace entity.
 */

// API hooks
export * from './api/hooks'

// Re-export types from shared for convenience
export type { CreateWorkspaceInput, Workspace, WorkspaceRole } from '@shared/api'
