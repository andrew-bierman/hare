/**
 * Agent Entity
 *
 * Business entity for AI agents.
 * Following Feature-Sliced Design, this is the public API for the agent entity.
 */

// API hooks
export * from './api/hooks'

// Re-export types from shared for convenience
export type { Agent, AgentConfig, AgentStatus, CreateAgentInput, UpdateAgentInput } from '@shared/api'
