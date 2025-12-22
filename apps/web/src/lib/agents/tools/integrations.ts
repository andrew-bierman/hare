import { z } from 'zod'
import { createTool, success, failure, type ToolContext } from './types'

/**
 * Integration Philosophy:
 *
 * Instead of managing individual API keys for every service (Twilio, SendGrid, etc.),
 * we use Zapier/Make/n8n as the integration layer. This approach:
 *
 * 1. Reduces API key management complexity
 * 2. Leverages Zapier's 6,000+ app connections
 * 3. Lets users configure integrations visually in Zapier
 * 4. Keeps sensitive credentials in Zapier, not in Hare
 *
 * For webhook-only services (Slack, Discord, Teams), we support direct webhooks
 * since they only require a URL, not API keys.
 */

/**
 * Zapier Webhook Tool - The primary integration hub
 *
 * Connect to 6,000+ apps through Zapier including:
 * - Email: Gmail, Outlook, SendGrid, Mailchimp
 * - SMS: Twilio, MessageBird
 * - CRM: Salesforce, HubSpot, Pipedrive
 * - Databases: Airtable, Google Sheets, Notion
 * - Project Management: Asana, Trello, Monday
 * - And thousands more...
 */
export const zapierTool = createTool({
	id: 'zapier',
	description: `Trigger Zapier automations to connect with 6,000+ apps.

**Setup:**
1. Go to zapier.com and create a new Zap
2. Choose "Webhooks by Zapier" as the trigger
3. Select "Catch Hook"
4. Copy the webhook URL
5. Use that URL here

**Common Use Cases:**
- Send emails (Gmail, SendGrid, Mailchimp)
- Send SMS (Twilio, MessageBird)
- Update CRM (Salesforce, HubSpot)
- Create records (Airtable, Notion, Google Sheets)
- Post to social media
- Create tickets (Zendesk, Intercom)

The data you send will be available in subsequent Zap steps.`,
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
 * Slack Webhook Tool - No API key needed, just webhook URL
 */
export const slackTool = createTool({
	id: 'slack',
	description: `Send messages to Slack using incoming webhooks.

**Setup:** Slack > Apps > Incoming Webhooks > Add to Slack > Select channel > Copy URL

Supports Block Kit for rich formatting.`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('Slack webhook URL'),
		text: z.string().optional().describe('Message text'),
		blocks: z.array(z.record(z.string(), z.unknown())).optional().describe('Block Kit blocks'),
		username: z.string().optional().describe('Bot username'),
		iconEmoji: z.string().optional().describe('Bot emoji (e.g., ":robot:")'),
	}),
	execute: async (params, context) => {
		try {
			const { webhookUrl, text, blocks, username, iconEmoji } = params

			if (!text && !blocks) return failure('Either text or blocks required')
			if (!webhookUrl.includes('hooks.slack.com')) {
				return failure('Invalid Slack webhook URL')
			}

			const payload: Record<string, unknown> = {}
			if (text) payload.text = text
			if (blocks) payload.blocks = blocks
			if (username) payload.username = username
			if (iconEmoji) payload.icon_emoji = iconEmoji

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			const responseText = await response.text()
			if (!response.ok || responseText !== 'ok') {
				return failure(`Slack error: ${responseText}`)
			}

			return success({ sent: true })
		} catch (error) {
			return failure(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
		}
	},
})

/**
 * Discord Webhook Tool - No API key needed, just webhook URL
 */
export const discordTool = createTool({
	id: 'discord',
	description: `Send messages to Discord using webhooks.

**Setup:** Server Settings > Integrations > Webhooks > New Webhook > Copy URL

Supports embeds for rich formatting.`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('Discord webhook URL'),
		content: z.string().optional().describe('Message text (max 2000)'),
		username: z.string().optional().describe('Override username'),
		avatarUrl: z.string().optional().describe('Override avatar'),
		embeds: z
			.array(
				z.object({
					title: z.string().optional(),
					description: z.string().optional(),
					color: z.number().optional(),
					url: z.string().optional(),
					fields: z.array(z.object({ name: z.string(), value: z.string(), inline: z.boolean().optional() })).optional(),
				})
			)
			.optional()
			.describe('Rich embeds (max 10)'),
	}),
	execute: async (params, context) => {
		try {
			const { webhookUrl, content, username, avatarUrl, embeds } = params

			if (!content && !embeds?.length) return failure('Either content or embeds required')
			if (!webhookUrl.includes('discord.com/api/webhooks') && !webhookUrl.includes('discordapp.com/api/webhooks')) {
				return failure('Invalid Discord webhook URL')
			}

			const payload: Record<string, unknown> = {}
			if (content) payload.content = content.slice(0, 2000)
			if (username) payload.username = username
			if (avatarUrl) payload.avatar_url = avatarUrl
			if (embeds) payload.embeds = embeds.slice(0, 10)

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			if (response.status === 204) return success({ sent: true })
			if (!response.ok) {
				const error = await response.json().catch(() => ({}))
				return failure(`Discord error: ${JSON.stringify(error)}`)
			}

			return success({ sent: true })
		} catch (error) {
			return failure(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
		}
	},
})

/**
 * Microsoft Teams Webhook Tool - No API key needed
 */
export const teamsTool = createTool({
	id: 'teams',
	description: `Send messages to Microsoft Teams using incoming webhooks.

**Setup:** Channel > Connectors > Incoming Webhook > Configure > Copy URL`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('Teams webhook URL'),
		text: z.string().optional().describe('Message text'),
		title: z.string().optional(),
		themeColor: z.string().optional().describe('Hex color (e.g., "0076D7")'),
		sections: z
			.array(
				z.object({
					activityTitle: z.string().optional(),
					activitySubtitle: z.string().optional(),
					facts: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
					text: z.string().optional(),
				})
			)
			.optional(),
	}),
	execute: async (params, context) => {
		try {
			const { webhookUrl, text, title, themeColor, sections } = params

			if (!text && !sections) return failure('Either text or sections required')

			const payload: Record<string, unknown> = {
				'@type': 'MessageCard',
				'@context': 'http://schema.org/extensions',
			}
			if (text) payload.text = text
			if (title) payload.title = title
			if (themeColor) payload.themeColor = themeColor
			if (sections) payload.sections = sections

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				return failure(`Teams error: ${await response.text()}`)
			}

			return success({ sent: true })
		} catch (error) {
			return failure(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
		}
	},
})

/**
 * Make (Integromat) Webhook Tool
 */
export const makeTool = createTool({
	id: 'make',
	description: `Trigger Make (Integromat) scenarios via webhooks. Alternative to Zapier with 1000+ apps.

**Setup:** Create scenario > Add Webhooks trigger > Copy URL`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('Make webhook URL'),
		data: z.record(z.string(), z.unknown()).describe('Data to send'),
	}),
	execute: async (params, context) => {
		try {
			const { webhookUrl, data } = params

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'User-Agent': 'Hare-Agent/1.0' },
				body: JSON.stringify({
					...data,
					_hare: { workspaceId: context.workspaceId, timestamp: new Date().toISOString() },
				}),
			})

			if (!response.ok) {
				return failure(`Make error: ${response.status}`)
			}

			const responseData = await response.json().catch(() => response.text())
			return success({ triggered: true, response: responseData })
		} catch (error) {
			return failure(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
		}
	},
})

/**
 * n8n Webhook Tool
 */
export const n8nTool = createTool({
	id: 'n8n',
	description: `Trigger n8n workflow automations. Open-source alternative to Zapier.

**Setup:** Add Webhook node as trigger > Copy URL`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('n8n webhook URL'),
		data: z.record(z.string(), z.unknown()).describe('Data to send'),
	}),
	execute: async (params, context) => {
		try {
			const { webhookUrl, data } = params

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'User-Agent': 'Hare-Agent/1.0' },
				body: JSON.stringify({
					...data,
					_hare: { workspaceId: context.workspaceId, timestamp: new Date().toISOString() },
				}),
			})

			if (!response.ok) {
				return failure(`n8n error: ${response.status}`)
			}

			const responseData = await response.json().catch(() => response.text())
			return success({ triggered: true, response: responseData })
		} catch (error) {
			return failure(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
		}
	},
})

/**
 * Get all integration tools (webhook-based only, no API keys required)
 */
export function getIntegrationTools(context: ToolContext) {
	return [
		zapierTool, // Primary hub for 6000+ apps
		webhookTool, // Generic webhooks
		slackTool, // Direct Slack webhooks
		discordTool, // Direct Discord webhooks
		teamsTool, // Direct Teams webhooks
		makeTool, // Alternative to Zapier
		n8nTool, // Open-source automation
	]
}
