import { z } from 'zod'
import { createTool, success, failure, type ToolContext } from './types'

/**
 * Integration Philosophy:
 *
 * All external service integrations go through Zapier. This approach:
 *
 * 1. Zero API key management - users connect services in their Zapier account
 * 2. 6,000+ app connections available immediately
 * 3. Users configure integrations visually in Zapier's UI
 * 4. Credentials stay in Zapier, not in Hare
 * 5. No external service testing/maintenance burden
 *
 * For custom integrations, use the generic webhook tool.
 */

/**
 * Zapier Webhook Tool - THE integration hub for all external services
 *
 * Connect to 6,000+ apps through the user's Zapier account:
 * - Communication: Slack, Discord, Teams, Email, SMS
 * - CRM: Salesforce, HubSpot, Pipedrive
 * - Databases: Airtable, Google Sheets, Notion
 * - Project Management: Asana, Trello, Monday, Jira
 * - Marketing: Mailchimp, SendGrid, Intercom
 * - And thousands more...
 */
export const zapierTool = createTool({
	id: 'zapier',
	description: `Connect to 6,000+ apps through Zapier - the single integration point for all external services.

**Setup:**
1. Go to zapier.com and create a new Zap
2. Choose "Webhooks by Zapier" as the trigger
3. Select "Catch Hook"
4. Copy the webhook URL
5. Use that URL here

**Examples:**
- Send Slack messages → Zapier connects to Slack
- Send emails → Zapier connects to Gmail/SendGrid
- Send SMS → Zapier connects to Twilio
- Update CRM → Zapier connects to Salesforce/HubSpot
- Create tickets → Zapier connects to Zendesk/Jira
- Post to social → Zapier connects to Twitter/LinkedIn

All service credentials are managed in your Zapier account, not here.`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('Zapier webhook URL (https://hooks.zapier.com/...)'),
		data: z.record(z.string(), z.unknown()).describe('Data to send (available in your Zap)'),
		waitForResponse: z.boolean().optional().default(false).describe('Wait for Zap response (requires Webhooks by Zapier premium)'),
	}),
	execute: async (params, context) => {
		try {
			const { webhookUrl, data, waitForResponse } = params

			if (!webhookUrl.includes('hooks.zapier.com')) {
				return failure('Invalid URL. Zapier webhooks start with https://hooks.zapier.com/')
			}

			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), waitForResponse ? 30000 : 10000)

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'User-Agent': 'Hare-Agent/1.0' },
				body: JSON.stringify({
					...data,
					_hare: { workspaceId: context.workspaceId, timestamp: new Date().toISOString() },
				}),
				signal: controller.signal,
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				return failure(`Zapier error: ${response.status} ${response.statusText}`)
			}

			const responseData = await response.json().catch(() => response.text())

			return success({
				triggered: true,
				status: response.status,
				response: waitForResponse ? responseData : 'Triggered successfully',
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return failure('Request timed out')
			}
			return failure(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
		}
	},
})

/**
 * Generic Webhook Tool
 */
export const webhookTool = createTool({
	id: 'webhook',
	description: 'Send data to any webhook endpoint with authentication support.',
	inputSchema: z.object({
		url: z.string().url().describe('Webhook URL'),
		method: z.enum(['POST', 'PUT', 'PATCH']).optional().default('POST'),
		data: z.unknown().describe('Request body'),
		headers: z.record(z.string(), z.string()).optional().describe('Custom headers'),
		auth: z
			.object({
				type: z.enum(['bearer', 'basic', 'apikey']),
				token: z.string().optional(),
				username: z.string().optional(),
				password: z.string().optional(),
				headerName: z.string().optional().default('X-API-Key'),
			})
			.optional(),
		timeout: z.number().optional().default(30000),
	}),
	execute: async (params, context) => {
		try {
			const { url, method, data, headers: customHeaders, auth, timeout } = params

			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
				'User-Agent': 'Hare-Agent/1.0',
				...customHeaders,
			}

			if (auth) {
				if (auth.type === 'bearer' && auth.token) {
					headers['Authorization'] = `Bearer ${auth.token}`
				} else if (auth.type === 'basic' && auth.username && auth.password) {
					headers['Authorization'] = `Basic ${btoa(`${auth.username}:${auth.password}`)}`
				} else if (auth.type === 'apikey' && auth.token) {
					headers[auth.headerName || 'X-API-Key'] = auth.token
				}
			}

			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), timeout)

			const response = await fetch(url, {
				method,
				headers,
				body: JSON.stringify(data),
				signal: controller.signal,
			})

			clearTimeout(timeoutId)

			const responseData = await response.json().catch(() => response.text())

			return success({
				status: response.status,
				ok: response.ok,
				data: responseData,
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return failure('Request timed out')
			}
			return failure(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
		}
	},
})

/**
 * Get all integration tools
 *
 * Just Zapier (for external services) + generic webhook (for custom integrations)
 */
export function getIntegrationTools(context: ToolContext) {
	return [
		zapierTool,
		webhookTool,
	]
}
