/**
 * Deployment Service
 *
 * Handles agent deployment operations including:
 * - URL generation for deployed agents
 * - Deployment record management
 * - Rollback functionality
 * - Health monitoring integration
 */

import { eq } from 'drizzle-orm'
import { agents, deployments, type Database } from '@hare/db'
import { serverEnv } from '@hare/config'

// =============================================================================
// Types
// =============================================================================

export interface DeploymentConfig {
	agentId: string
	version: string
	environment?: 'production' | 'staging' | 'development'
	deployedBy: string
}

export interface DeploymentResult {
	id: string
	agentId: string
	version: string
	status: 'active' | 'pending' | 'failed'
	url: string
	wsUrl: string
	deployedAt: Date
	metadata?: {
		buildTime?: number
		config?: Record<string, unknown>
	}
}

export interface RollbackResult {
	success: boolean
	previousVersion?: string
	currentVersion?: string
	message: string
}

// =============================================================================
// URL Generation
// =============================================================================

/**
 * Generate the base URL for the application based on environment.
 */
function getBaseUrl(): string {
	// Use configured app URL if available
	if (serverEnv.APP_URL) {
		return serverEnv.APP_URL
	}

	// Fallback for local development
	return 'http://localhost:3000'
}

/**
 * Generate deployment URLs for an agent.
 *
 * The agent is accessed via Durable Objects, which are routed through
 * the main application. URLs follow the pattern:
 * - HTTP API: /api/agents/{agentId}/do/{path}
 * - WebSocket: /api/agents/{agentId}/ws
 */
export function generateDeploymentUrls(options: { agentId: string }): {
	url: string
	wsUrl: string
	apiUrl: string
	healthUrl: string
} {
	const { agentId } = options
	const baseUrl = getBaseUrl()
	const wsBaseUrl = baseUrl.replace(/^http/, 'ws')

	return {
		// Main endpoint for HTTP requests to the agent
		url: `${baseUrl}/api/agents/${agentId}/do`,
		// WebSocket endpoint for real-time communication
		wsUrl: `${wsBaseUrl}/api/agents/${agentId}/ws`,
		// API endpoint for agent management
		apiUrl: `${baseUrl}/api/agents/${agentId}`,
		// Health check endpoint
		healthUrl: `${baseUrl}/api/agents/${agentId}/do/health`,
	}
}

// =============================================================================
// Deployment Operations
// =============================================================================

/**
 * Create a new deployment for an agent.
 */
export async function createDeployment(options: {
	db: Database
	config: DeploymentConfig
	agentConfig?: Record<string, unknown>
}): Promise<DeploymentResult> {
	const { db, config, agentConfig } = options
	const { agentId, version, environment = 'production', deployedBy } = config

	// Generate deployment URLs
	const urls = generateDeploymentUrls({ agentId })

	// Create deployment record
	const [deployment] = await db
		.insert(deployments)
		.values({
			agentId,
			version,
			environment,
			status: 'active',
			url: urls.url,
			metadata: {
				buildTime: Date.now(),
				config: agentConfig,
			},
			deployedBy,
		})
		.returning()

	if (!deployment) {
		throw new Error('Failed to create deployment record')
	}

	// Update agent status to deployed
	await db
		.update(agents)
		.set({
			status: 'deployed',
			updatedAt: new Date(),
		})
		.where(eq(agents.id, agentId))

	return {
		id: deployment.id,
		agentId: deployment.agentId,
		version: deployment.version,
		status: deployment.status as 'active' | 'pending' | 'failed',
		url: urls.url,
		wsUrl: urls.wsUrl,
		deployedAt: deployment.deployedAt,
		metadata: deployment.metadata as DeploymentResult['metadata'],
	}
}

/**
 * Get the current active deployment for an agent.
 */
export async function getActiveDeployment(options: {
	db: Database
	agentId: string
}): Promise<DeploymentResult | null> {
	const { db, agentId } = options

	const [deployment] = await db
		.select()
		.from(deployments)
		.where(eq(deployments.agentId, agentId))
		.orderBy(deployments.deployedAt)
		.limit(1)

	if (!deployment || deployment.status !== 'active') {
		return null
	}

	const urls = generateDeploymentUrls({ agentId })

	return {
		id: deployment.id,
		agentId: deployment.agentId,
		version: deployment.version,
		status: deployment.status as 'active' | 'pending' | 'failed',
		url: urls.url,
		wsUrl: urls.wsUrl,
		deployedAt: deployment.deployedAt,
		metadata: deployment.metadata as DeploymentResult['metadata'],
	}
}

/**
 * Get deployment history for an agent.
 */
export async function getDeploymentHistory(options: {
	db: Database
	agentId: string
	limit?: number
}): Promise<DeploymentResult[]> {
	const { db, agentId, limit = 10 } = options

	const results = await db
		.select()
		.from(deployments)
		.where(eq(deployments.agentId, agentId))
		.orderBy(deployments.deployedAt)
		.limit(limit)

	return results.map((deployment) => {
		const urls = generateDeploymentUrls({ agentId })
		return {
			id: deployment.id,
			agentId: deployment.agentId,
			version: deployment.version,
			status: deployment.status as 'active' | 'pending' | 'failed',
			url: urls.url,
			wsUrl: urls.wsUrl,
			deployedAt: deployment.deployedAt,
			metadata: deployment.metadata as DeploymentResult['metadata'],
		}
	})
}

/**
 * Rollback to a previous deployment version.
 */
export async function rollbackDeployment(options: {
	db: Database
	agentId: string
	targetVersion?: string
	deployedBy: string
}): Promise<RollbackResult> {
	const { db, agentId, targetVersion, deployedBy } = options

	// Get current active deployment
	const currentDeployment = await getActiveDeployment({ db, agentId })
	if (!currentDeployment) {
		return {
			success: false,
			message: 'No active deployment found',
		}
	}

	// Get deployment history
	const history = await getDeploymentHistory({ db, agentId, limit: 10 })

	// Find target deployment
	let targetDeployment: DeploymentResult | undefined
	if (targetVersion) {
		targetDeployment = history.find((d) => d.version === targetVersion)
	} else {
		// Default to previous deployment
		targetDeployment = history.find(
			(d) => d.version !== currentDeployment.version && d.status === 'active',
		)
	}

	if (!targetDeployment) {
		return {
			success: false,
			currentVersion: currentDeployment.version,
			message: targetVersion
				? `Version ${targetVersion} not found in deployment history`
				: 'No previous deployment found to rollback to',
		}
	}

	// Mark current deployment as rolled back
	await db
		.update(deployments)
		.set({ status: 'rolled_back' })
		.where(eq(deployments.id, currentDeployment.id))

	// Create new deployment with target version's config
	const urls = generateDeploymentUrls({ agentId })
	const [newDeployment] = await db
		.insert(deployments)
		.values({
			agentId,
			version: targetDeployment.version,
			environment: 'production',
			status: 'active',
			url: urls.url,
			metadata: {
				buildTime: Date.now(),
				rollbackFrom: currentDeployment.version,
				config: targetDeployment.metadata?.config,
			},
			deployedBy,
		})
		.returning()

	if (!newDeployment) {
		return {
			success: false,
			currentVersion: currentDeployment.version,
			message: 'Failed to create rollback deployment',
		}
	}

	return {
		success: true,
		previousVersion: currentDeployment.version,
		currentVersion: targetDeployment.version,
		message: `Rolled back from ${currentDeployment.version} to ${targetDeployment.version}`,
	}
}

/**
 * Deactivate a deployment (undeploy an agent).
 */
export async function deactivateDeployment(options: {
	db: Database
	agentId: string
}): Promise<{ success: boolean; message: string }> {
	const { db, agentId } = options

	// Update all active deployments to inactive
	await db.update(deployments).set({ status: 'inactive' }).where(eq(deployments.agentId, agentId))

	// Update agent status to draft
	await db
		.update(agents)
		.set({
			status: 'draft',
			updatedAt: new Date(),
		})
		.where(eq(agents.id, agentId))

	return {
		success: true,
		message: 'Agent undeployed successfully',
	}
}

// =============================================================================
// Health Check Integration
// =============================================================================

/**
 * Check the health of a deployed agent.
 */
export async function checkDeploymentHealth(options: {
	agentId: string
	timeout?: number
}): Promise<{
	healthy: boolean
	latencyMs: number
	error?: string
}> {
	const { agentId, timeout = 5000 } = options
	const urls = generateDeploymentUrls({ agentId })

	const start = Date.now()

	try {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), timeout)

		const response = await fetch(urls.healthUrl, {
			signal: controller.signal,
		})

		clearTimeout(timeoutId)
		const latencyMs = Date.now() - start

		if (response.ok) {
			return {
				healthy: true,
				latencyMs,
			}
		}

		return {
			healthy: false,
			latencyMs,
			error: `Health check returned ${response.status}`,
		}
	} catch (error) {
		return {
			healthy: false,
			latencyMs: Date.now() - start,
			error: error instanceof Error ? error.message : 'Health check failed',
		}
	}
}
