import { OpenAPIHono } from '@hono/zod-openapi'
import { agents } from '@hare/db'
import { serverEnv } from '@hare/config'
import { getDb } from '../db'
import { authMiddleware, workspaceMiddleware } from '../middleware'
import type { WorkspaceEnv } from '@hare/types'

const app = new OpenAPIHono<WorkspaceEnv>()

// Sample agents data for seeding
const sampleAgents = [
	{
		name: 'Customer Support Bunny',
		description: 'A friendly rabbit that helps users with common questions and support tickets',
		model: 'llama-3.3-70b',
		instructions: `You are a helpful customer support assistant with a playful rabbit personality.
Your name is "Hoppy" and you love helping users solve their problems.
- Be friendly and approachable
- Use occasional rabbit-themed expressions like "hopping to help!"
- Always aim to resolve issues on first contact
- Escalate complex issues when needed`,
		status: 'deployed' as const,
	},
	{
		name: 'Code Review Hare',
		description: 'Reviews pull requests and provides constructive feedback on code quality',
		model: 'claude-3-5-sonnet',
		instructions: `You are a senior code reviewer with expertise in TypeScript, React, and Node.js.
- Focus on code quality, performance, and security
- Provide specific, actionable feedback
- Suggest improvements with code examples
- Be encouraging while maintaining high standards`,
		status: 'deployed' as const,
	},
	{
		name: 'Data Analyst Rabbit',
		description: 'Analyzes data and generates insights from your databases',
		model: 'gpt-4o',
		instructions: `You are a data analyst that helps users understand their data.
- Write efficient SQL queries
- Create clear visualizations and summaries
- Identify trends and anomalies
- Explain complex data in simple terms`,
		status: 'draft' as const,
	},
	{
		name: 'Content Writer Warren',
		description: 'Creates engaging blog posts, documentation, and marketing copy',
		model: 'claude-3-5-haiku',
		instructions: `You are a creative content writer specializing in tech and SaaS content.
- Write clear, engaging content
- Adapt tone to the target audience
- Optimize for SEO when appropriate
- Include relevant examples and analogies`,
		status: 'draft' as const,
	},
	{
		name: 'DevOps Jackrabbit',
		description: 'Helps with CI/CD pipelines, infrastructure, and deployments',
		model: 'llama-3.3-70b',
		instructions: `You are a DevOps engineer specialized in cloud infrastructure.
- Help with Docker, Kubernetes, and cloud platforms
- Assist with CI/CD pipeline configuration
- Provide security best practices
- Optimize for reliability and cost`,
		status: 'deployed' as const,
	},
]

// Seed endpoint - only available in development
app.post('/seed', authMiddleware, workspaceMiddleware, async (c) => {
	// Check if we're in development
	if (serverEnv.NODE_ENV === 'production') {
		return c.json({ error: 'Seed endpoint only available in development' }, 403)
	}

	const db = getDb(c)
	const user = c.get('user')
	const workspace = c.get('workspace')

	try {
		// Create sample agents
		const createdAgents = await Promise.all(
			sampleAgents.map((agent) =>
				db
					.insert(agents)
					.values({
						workspaceId: workspace.id,
						name: agent.name,
						description: agent.description,
						model: agent.model,
						instructions: agent.instructions,
						status: agent.status,
						createdBy: user.id,
					})
					.returning(),
			),
		)

		return c.json({
			success: true,
			created: {
				agents: createdAgents.flat().length,
			},
		})
	} catch (error) {
		console.error('Seed error:', error)
		return c.json({ error: 'Failed to seed data' }, 500)
	}
})

export default app
