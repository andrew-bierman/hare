import { z } from 'zod'
import { createTool, success, failure, type ToolContext } from './types'

/**
 * Zapier Webhook Tool - Trigger Zapier automations via webhooks.
 *
 * Zapier webhooks allow you to connect AI agents to 6,000+ apps including:
 * - Google Sheets, Docs, Drive
 * - Slack, Discord, Microsoft Teams
 * - Salesforce, HubSpot, Pipedrive
 * - Gmail, Outlook, Mailchimp
 * - Notion, Airtable, Trello
 * - And thousands more...
 */
export const zapierTool = createTool({
	id: 'zapier',
	description: `Trigger Zapier automations via webhooks. Connect to 6,000+ apps including Google Sheets, Slack, Salesforce, Gmail, Notion, and more.

To use: Create a Zap in Zapier with "Webhooks by Zapier" as the trigger (choose "Catch Hook"). Copy the webhook URL and use it here. The data you send will be available in subsequent Zapier steps.`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('Zapier webhook URL (starts with https://hooks.zapier.com/)'),
		data: z.record(z.string(), z.unknown()).describe('Data to send to Zapier (will be available in your Zap)'),
		waitForResponse: z
			.boolean()
			.optional()
			.default(false)
			.describe('Wait for Zapier to respond (requires "Webhooks" premium action in Zap)'),
	}),
	execute: async (params, context) => {
		try {
			const { webhookUrl, data, waitForResponse } = params

			// Validate it's a Zapier webhook URL
			if (!webhookUrl.includes('hooks.zapier.com')) {
				return failure('Invalid Zapier webhook URL. Must be a hooks.zapier.com URL.')
			}

			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), waitForResponse ? 30000 : 10000)

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'Hare-Agent/1.0',
				},
				body: JSON.stringify({
					...data,
					_meta: {
						source: 'hare-agent',
						workspaceId: context.workspaceId,
						timestamp: new Date().toISOString(),
					},
				}),
				signal: controller.signal,
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				return failure(`Zapier webhook failed with status ${response.status}: ${response.statusText}`)
			}

			let responseData: unknown = null
			const contentType = response.headers.get('content-type')
			if (contentType?.includes('application/json')) {
				responseData = await response.json()
			} else {
				responseData = await response.text()
			}

			return success({
				triggered: true,
				status: response.status,
				response: waitForResponse ? responseData : 'Webhook triggered (not waiting for response)',
				zapierRequestId: response.headers.get('x-request-id'),
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return failure('Zapier webhook request timed out')
			}
			return failure(`Zapier error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Generic Webhook Tool - Send data to any webhook endpoint.
 */
export const webhookTool = createTool({
	id: 'webhook',
	description:
		'Send data to any webhook endpoint. Supports various HTTP methods, custom headers, and authentication.',
	inputSchema: z.object({
		url: z.string().url().describe('Webhook URL'),
		method: z.enum(['POST', 'PUT', 'PATCH']).optional().default('POST').describe('HTTP method'),
		data: z.unknown().describe('Data to send in the webhook body'),
		headers: z.record(z.string(), z.string()).optional().describe('Custom headers'),
		contentType: z
			.enum(['application/json', 'application/x-www-form-urlencoded', 'text/plain'])
			.optional()
			.default('application/json')
			.describe('Content type'),
		auth: z
			.object({
				type: z.enum(['bearer', 'basic', 'apikey']),
				token: z.string().optional(),
				username: z.string().optional(),
				password: z.string().optional(),
				headerName: z.string().optional(),
			})
			.optional()
			.describe('Authentication configuration'),
		timeout: z.number().optional().default(30000).describe('Request timeout in milliseconds'),
		retries: z.number().optional().default(0).describe('Number of retries on failure'),
	}),
	execute: async (params, context) => {
		try {
			const { url, method, data, headers: customHeaders, contentType, auth, timeout, retries } = params

			const buildHeaders = (): Record<string, string> => {
				const headers: Record<string, string> = {
					'Content-Type': contentType,
					'User-Agent': 'Hare-Agent/1.0',
					...customHeaders,
				}

				if (auth) {
					switch (auth.type) {
						case 'bearer':
							if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`
							break
						case 'basic':
							if (auth.username && auth.password) {
								headers['Authorization'] = `Basic ${btoa(`${auth.username}:${auth.password}`)}`
							}
							break
						case 'apikey':
							if (auth.token) {
								headers[auth.headerName || 'X-API-Key'] = auth.token
							}
							break
					}
				}

				return headers
			}

			const formatBody = (): string => {
				if (contentType === 'application/x-www-form-urlencoded' && typeof data === 'object' && data !== null) {
					return new URLSearchParams(data as Record<string, string>).toString()
				}
				if (contentType === 'text/plain' && typeof data === 'string') {
					return data
				}
				return JSON.stringify(data)
			}

			let lastError: Error | null = null
			const maxAttempts = retries + 1

			for (let attempt = 1; attempt <= maxAttempts; attempt++) {
				try {
					const controller = new AbortController()
					const timeoutId = setTimeout(() => controller.abort(), timeout)

					const response = await fetch(url, {
						method,
						headers: buildHeaders(),
						body: formatBody(),
						signal: controller.signal,
					})

					clearTimeout(timeoutId)

					let responseData: unknown
					const responseContentType = response.headers.get('content-type')
					if (responseContentType?.includes('application/json')) {
						responseData = await response.json()
					} else {
						responseData = await response.text()
					}

					return success({
						status: response.status,
						statusText: response.statusText,
						ok: response.ok,
						data: responseData,
						headers: Object.fromEntries(response.headers.entries()),
						attempt,
					})
				} catch (error) {
					lastError = error instanceof Error ? error : new Error('Unknown error')
					if (attempt < maxAttempts) {
						await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
					}
				}
			}

			return failure(`Webhook failed after ${maxAttempts} attempts: ${lastError?.message}`)
		} catch (error) {
			return failure(`Webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Slack Webhook Tool - Send messages to Slack channels.
 */
export const slackTool = createTool({
	id: 'slack',
	description: `Send messages to Slack channels using incoming webhooks.

To set up: In Slack, go to Apps > Incoming Webhooks > Add to Slack, select a channel, and copy the webhook URL.

Supports rich formatting with blocks, attachments, and markdown.`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('Slack incoming webhook URL'),
		text: z.string().optional().describe('Plain text message (fallback)'),
		blocks: z.array(z.record(z.string(), z.unknown())).optional().describe('Slack Block Kit blocks for rich formatting'),
		attachments: z
			.array(
				z.object({
					color: z.string().optional(),
					title: z.string().optional(),
					text: z.string().optional(),
					fields: z
						.array(
							z.object({
								title: z.string(),
								value: z.string(),
								short: z.boolean().optional(),
							})
						)
						.optional(),
					footer: z.string().optional(),
					ts: z.number().optional(),
				})
			)
			.optional()
			.describe('Legacy attachments'),
		channel: z.string().optional().describe('Override channel (requires additional permissions)'),
		username: z.string().optional().describe('Custom bot username'),
		iconEmoji: z.string().optional().describe('Custom bot emoji (e.g., ":robot:")'),
		iconUrl: z.string().optional().describe('Custom bot icon URL'),
		unfurlLinks: z.boolean().optional().default(true).describe('Unfurl links in the message'),
		unfurlMedia: z.boolean().optional().default(true).describe('Unfurl media in the message'),
	}),
	execute: async (params, context) => {
		try {
			const {
				webhookUrl,
				text,
				blocks,
				attachments,
				channel,
				username,
				iconEmoji,
				iconUrl,
				unfurlLinks,
				unfurlMedia,
			} = params

			if (!text && !blocks) {
				return failure('Either text or blocks is required')
			}

			// Validate Slack webhook URL
			if (!webhookUrl.includes('hooks.slack.com')) {
				return failure('Invalid Slack webhook URL. Must be a hooks.slack.com URL.')
			}

			const payload: Record<string, unknown> = {
				unfurl_links: unfurlLinks,
				unfurl_media: unfurlMedia,
			}

			if (text) payload.text = text
			if (blocks) payload.blocks = blocks
			if (attachments) payload.attachments = attachments
			if (channel) payload.channel = channel
			if (username) payload.username = username
			if (iconEmoji) payload.icon_emoji = iconEmoji
			if (iconUrl) payload.icon_url = iconUrl

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			const responseText = await response.text()

			if (!response.ok || responseText !== 'ok') {
				return failure(`Slack API error: ${responseText}`)
			}

			return success({
				sent: true,
				channel: channel || 'default',
			})
		} catch (error) {
			return failure(`Slack error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Discord Webhook Tool - Send messages to Discord channels.
 */
export const discordTool = createTool({
	id: 'discord',
	description: `Send messages to Discord channels using webhooks.

To set up: In Discord, go to Server Settings > Integrations > Webhooks > New Webhook, configure it, and copy the webhook URL.

Supports embeds, username/avatar customization, and mentions.`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('Discord webhook URL'),
		content: z.string().optional().describe('Plain text message content (max 2000 chars)'),
		username: z.string().optional().describe('Override webhook username'),
		avatarUrl: z.string().optional().describe('Override webhook avatar URL'),
		tts: z.boolean().optional().default(false).describe('Text-to-speech message'),
		embeds: z
			.array(
				z.object({
					title: z.string().optional(),
					description: z.string().optional(),
					url: z.string().optional(),
					color: z.number().optional().describe('Embed color (decimal, e.g., 5814783 for blue)'),
					timestamp: z.string().optional().describe('ISO 8601 timestamp'),
					footer: z.object({ text: z.string(), icon_url: z.string().optional() }).optional(),
					thumbnail: z.object({ url: z.string() }).optional(),
					image: z.object({ url: z.string() }).optional(),
					author: z
						.object({
							name: z.string(),
							url: z.string().optional(),
							icon_url: z.string().optional(),
						})
						.optional(),
					fields: z
						.array(
							z.object({
								name: z.string(),
								value: z.string(),
								inline: z.boolean().optional(),
							})
						)
						.optional(),
				})
			)
			.optional()
			.describe('Rich embed objects (max 10)'),
		allowedMentions: z
			.object({
				parse: z.array(z.enum(['roles', 'users', 'everyone'])).optional(),
				roles: z.array(z.string()).optional(),
				users: z.array(z.string()).optional(),
			})
			.optional()
			.describe('Allowed mentions configuration'),
	}),
	execute: async (params, context) => {
		try {
			const { webhookUrl, content, username, avatarUrl, tts, embeds, allowedMentions } = params

			if (!content && (!embeds || embeds.length === 0)) {
				return failure('Either content or embeds is required')
			}

			// Validate Discord webhook URL
			if (!webhookUrl.includes('discord.com/api/webhooks') && !webhookUrl.includes('discordapp.com/api/webhooks')) {
				return failure('Invalid Discord webhook URL')
			}

			const payload: Record<string, unknown> = {}
			if (content) payload.content = content.slice(0, 2000)
			if (username) payload.username = username
			if (avatarUrl) payload.avatar_url = avatarUrl
			if (tts) payload.tts = tts
			if (embeds) payload.embeds = embeds.slice(0, 10)
			if (allowedMentions) payload.allowed_mentions = allowedMentions

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			// Discord returns 204 No Content on success
			if (response.status === 204) {
				return success({ sent: true })
			}

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
				return failure(`Discord API error: ${JSON.stringify(errorData)}`)
			}

			const data = await response.json().catch(() => null)
			return success({ sent: true, messageId: data?.id })
		} catch (error) {
			return failure(`Discord error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Email Tool - Send emails via various providers (Resend, SendGrid, Mailgun).
 */
export const emailTool = createTool({
	id: 'email',
	description: `Send emails using popular email service providers (Resend, SendGrid, Mailgun, or any SMTP-compatible API).

Requires an API key from your email provider. Supports HTML/text content, attachments metadata, and multiple recipients.`,
	inputSchema: z.object({
		provider: z
			.enum(['resend', 'sendgrid', 'mailgun', 'custom'])
			.describe('Email service provider'),
		apiKey: z.string().describe('API key for the email provider'),
		apiEndpoint: z.string().optional().describe('Custom API endpoint (for custom provider or Mailgun domain)'),
		from: z.string().describe('Sender email address'),
		to: z.union([z.string(), z.array(z.string())]).describe('Recipient email address(es)'),
		cc: z.union([z.string(), z.array(z.string())]).optional().describe('CC recipients'),
		bcc: z.union([z.string(), z.array(z.string())]).optional().describe('BCC recipients'),
		replyTo: z.string().optional().describe('Reply-to address'),
		subject: z.string().describe('Email subject'),
		text: z.string().optional().describe('Plain text body'),
		html: z.string().optional().describe('HTML body'),
		tags: z.array(z.string()).optional().describe('Email tags for tracking'),
	}),
	execute: async (params, context) => {
		try {
			const { provider, apiKey, apiEndpoint, from, to, cc, bcc, replyTo, subject, text, html, tags } = params

			if (!text && !html) {
				return failure('Either text or html body is required')
			}

			const toArray = Array.isArray(to) ? to : [to]
			const ccArray = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined
			const bccArray = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined

			let response: Response

			switch (provider) {
				case 'resend': {
					response = await fetch('https://api.resend.com/emails', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${apiKey}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							from,
							to: toArray,
							cc: ccArray,
							bcc: bccArray,
							reply_to: replyTo,
							subject,
							text,
							html,
							tags: tags?.map((t) => ({ name: t, value: 'true' })),
						}),
					})
					break
				}

				case 'sendgrid': {
					response = await fetch('https://api.sendgrid.com/v3/mail/send', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${apiKey}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							personalizations: [
								{
									to: toArray.map((email) => ({ email })),
									cc: ccArray?.map((email) => ({ email })),
									bcc: bccArray?.map((email) => ({ email })),
								},
							],
							from: { email: from },
							reply_to: replyTo ? { email: replyTo } : undefined,
							subject,
							content: [
								...(text ? [{ type: 'text/plain', value: text }] : []),
								...(html ? [{ type: 'text/html', value: html }] : []),
							],
							categories: tags,
						}),
					})
					break
				}

				case 'mailgun': {
					if (!apiEndpoint) {
						return failure('Mailgun requires apiEndpoint (your Mailgun domain)')
					}
					const formData = new FormData()
					formData.append('from', from)
					toArray.forEach((email) => formData.append('to', email))
					ccArray?.forEach((email) => formData.append('cc', email))
					bccArray?.forEach((email) => formData.append('bcc', email))
					if (replyTo) formData.append('h:Reply-To', replyTo)
					formData.append('subject', subject)
					if (text) formData.append('text', text)
					if (html) formData.append('html', html)
					tags?.forEach((tag) => formData.append('o:tag', tag))

					response = await fetch(`https://api.mailgun.net/v3/${apiEndpoint}/messages`, {
						method: 'POST',
						headers: {
							Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
						},
						body: formData,
					})
					break
				}

				case 'custom': {
					if (!apiEndpoint) {
						return failure('Custom provider requires apiEndpoint')
					}
					response = await fetch(apiEndpoint, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${apiKey}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							from,
							to: toArray,
							cc: ccArray,
							bcc: bccArray,
							replyTo,
							subject,
							text,
							html,
							tags,
						}),
					})
					break
				}

				default:
					return failure(`Unknown provider: ${provider}`)
			}

			if (!response.ok) {
				const errorText = await response.text()
				return failure(`Email API error (${response.status}): ${errorText}`)
			}

			// SendGrid returns 202 with no body
			if (response.status === 202) {
				return success({ sent: true, provider })
			}

			const data = await response.json().catch(() => ({}))
			return success({
				sent: true,
				provider,
				messageId: data.id,
				...data,
			})
		} catch (error) {
			return failure(`Email error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Microsoft Teams Webhook Tool - Send messages to Teams channels.
 */
export const teamsTool = createTool({
	id: 'teams',
	description: `Send messages to Microsoft Teams channels using incoming webhooks.

To set up: In Teams, go to channel > Connectors > Incoming Webhook > Configure, name it, and copy the webhook URL.

Supports Adaptive Cards for rich formatting.`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('Teams incoming webhook URL'),
		text: z.string().optional().describe('Simple text message'),
		title: z.string().optional().describe('Message title'),
		themeColor: z.string().optional().describe('Accent color (hex without #, e.g., "0076D7")'),
		sections: z
			.array(
				z.object({
					activityTitle: z.string().optional(),
					activitySubtitle: z.string().optional(),
					activityImage: z.string().optional(),
					facts: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
					text: z.string().optional(),
					markdown: z.boolean().optional().default(true),
				})
			)
			.optional()
			.describe('Message sections with rich content'),
		potentialAction: z
			.array(
				z.object({
					'@type': z.literal('OpenUri').or(z.literal('ActionCard')),
					name: z.string(),
					targets: z.array(z.object({ os: z.string(), uri: z.string() })).optional(),
				})
			)
			.optional()
			.describe('Action buttons'),
	}),
	execute: async (params, context) => {
		try {
			const { webhookUrl, text, title, themeColor, sections, potentialAction } = params

			if (!text && !sections) {
				return failure('Either text or sections is required')
			}

			const payload: Record<string, unknown> = {
				'@type': 'MessageCard',
				'@context': 'http://schema.org/extensions',
			}

			if (text) payload.text = text
			if (title) payload.title = title
			if (themeColor) payload.themeColor = themeColor
			if (sections) payload.sections = sections
			if (potentialAction) payload.potentialAction = potentialAction

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			// Teams returns "1" on success
			const responseText = await response.text()

			if (!response.ok) {
				return failure(`Teams API error: ${responseText}`)
			}

			return success({ sent: true })
		} catch (error) {
			return failure(`Teams error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Twilio SMS Tool - Send SMS messages.
 */
export const twilioSmsTool = createTool({
	id: 'twilio_sms',
	description: `Send SMS messages using Twilio.

Requires your Twilio Account SID, Auth Token, and a Twilio phone number.`,
	inputSchema: z.object({
		accountSid: z.string().describe('Twilio Account SID'),
		authToken: z.string().describe('Twilio Auth Token'),
		from: z.string().describe('Twilio phone number to send from (E.164 format, e.g., +1234567890)'),
		to: z.string().describe('Recipient phone number (E.164 format)'),
		body: z.string().max(1600).describe('Message body (max 1600 characters)'),
		statusCallback: z.string().optional().describe('Webhook URL for delivery status updates'),
	}),
	execute: async (params, context) => {
		try {
			const { accountSid, authToken, from, to, body, statusCallback } = params

			const formData = new URLSearchParams()
			formData.append('From', from)
			formData.append('To', to)
			formData.append('Body', body)
			if (statusCallback) formData.append('StatusCallback', statusCallback)

			const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: formData.toString(),
			})

			const data = await response.json()

			if (!response.ok) {
				return failure(`Twilio error: ${data.message || JSON.stringify(data)}`)
			}

			return success({
				sent: true,
				sid: data.sid,
				status: data.status,
				to: data.to,
				from: data.from,
			})
		} catch (error) {
			return failure(`Twilio error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Make (Integromat) Webhook Tool - Trigger Make scenarios.
 */
export const makeTool = createTool({
	id: 'make',
	description: `Trigger Make (formerly Integromat) scenarios via webhooks. Similar to Zapier, connects to 1000+ apps.

To use: Create a scenario in Make with a Webhooks trigger, copy the webhook URL.`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('Make webhook URL'),
		data: z.record(z.string(), z.unknown()).describe('Data to send to Make'),
	}),
	execute: async (params, context) => {
		try {
			const { webhookUrl, data } = params

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'Hare-Agent/1.0',
				},
				body: JSON.stringify({
					...data,
					_meta: {
						source: 'hare-agent',
						workspaceId: context.workspaceId,
						timestamp: new Date().toISOString(),
					},
				}),
			})

			if (!response.ok) {
				return failure(`Make webhook failed: ${response.status} ${response.statusText}`)
			}

			let responseData: unknown
			try {
				responseData = await response.json()
			} catch {
				responseData = await response.text()
			}

			return success({
				triggered: true,
				status: response.status,
				response: responseData,
			})
		} catch (error) {
			return failure(`Make error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * n8n Webhook Tool - Trigger n8n workflows.
 */
export const n8nTool = createTool({
	id: 'n8n',
	description: `Trigger n8n workflow automations via webhooks. n8n is an open-source workflow automation tool.

To use: Add a Webhook node to your n8n workflow, set it as the trigger, and copy the webhook URL.`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('n8n webhook URL'),
		data: z.record(z.string(), z.unknown()).describe('Data to send to n8n'),
		method: z.enum(['GET', 'POST']).optional().default('POST').describe('HTTP method'),
	}),
	execute: async (params, context) => {
		try {
			const { webhookUrl, data, method } = params

			const requestInit: RequestInit = {
				method,
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'Hare-Agent/1.0',
				},
			}

			if (method === 'POST') {
				requestInit.body = JSON.stringify({
					...data,
					_meta: {
						source: 'hare-agent',
						workspaceId: context.workspaceId,
						timestamp: new Date().toISOString(),
					},
				})
			}

			const response = await fetch(webhookUrl, requestInit)

			if (!response.ok) {
				return failure(`n8n webhook failed: ${response.status} ${response.statusText}`)
			}

			let responseData: unknown
			try {
				responseData = await response.json()
			} catch {
				responseData = await response.text()
			}

			return success({
				triggered: true,
				status: response.status,
				response: responseData,
			})
		} catch (error) {
			return failure(`n8n error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Get all integration tools.
 */
export function getIntegrationTools(context: ToolContext) {
	return [
		zapierTool,
		webhookTool,
		slackTool,
		discordTool,
		emailTool,
		teamsTool,
		twilioSmsTool,
		makeTool,
		n8nTool,
	]
}
