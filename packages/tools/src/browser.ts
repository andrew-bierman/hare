import { z } from 'zod'
import { isUrlSafe } from './security/ssrf'
import { createTool, failure, success, type ToolContext } from './types'

// ============================================================================
// Constants
// ============================================================================

/** Maximum content length returned from browse_url (50KB) */
const MAX_CONTENT_LENGTH = 50_000

// ============================================================================
// Output Schemas
// ============================================================================

const BrowseUrlOutputSchema = z.object({
	url: z.string(),
	title: z.string().nullable(),
	content: z.string(),
	contentLength: z.number(),
	truncated: z.boolean(),
})

const ScreenshotOutputSchema = z.object({
	url: z.string(),
	storagePath: z.string(),
	width: z.number(),
	height: z.number(),
	format: z.literal('png'),
})

// ============================================================================
// Tools
// ============================================================================

/**
 * Browse URL Tool - Navigate to a URL and extract text content.
 *
 * Uses Cloudflare Browser Rendering with SSRF protection (pre + post navigation).
 */
export const browseUrlTool = createTool({
	id: 'browse_url',
	description:
		'Navigate to a URL using a headless browser and extract the page text content. Useful for reading web pages that require JavaScript rendering.',
	inputSchema: z.object({
		url: z.string().url().describe('The URL to navigate to'),
	}),
	outputSchema: BrowseUrlOutputSchema,
	execute: async (params, context) => {
		if (!context.env.BROWSER) {
			return failure('Browser rendering binding not available')
		}

		// Pre-navigation SSRF check
		const preCheck = isUrlSafe(params.url)
		if (!preCheck.safe) {
			return failure(`Blocked URL: ${preCheck.reason}`)
		}

		try {
			// Dynamic import — puppeteer uses node:buffer which can't be bundled for client
			const puppeteer = await import('@cloudflare/puppeteer')
			const browser = await puppeteer.default.launch(context.env.BROWSER)

			try {
				const page = await browser.newPage()
				await page.goto(params.url, { waitUntil: 'domcontentloaded' })

				// Post-navigation SSRF check (detect redirects to private IPs)
				const finalUrl = page.url()
				const postCheck = isUrlSafe(finalUrl)
				if (!postCheck.safe) {
					return failure(`Blocked after redirect: ${postCheck.reason}`)
				}

				const title = await page.title()

				// Extract text content from the page
				const rawContent = await page.evaluate(() => {
					// Remove script and style elements
					const scripts = document.querySelectorAll('script, style, noscript')
					for (const el of scripts) {
						el.remove()
					}
					return document.body?.innerText || ''
				})

				const truncated = rawContent.length > MAX_CONTENT_LENGTH
				const content = truncated
					? rawContent.slice(0, MAX_CONTENT_LENGTH)
					: rawContent

				return success({
					url: finalUrl,
					title: title || null,
					content,
					contentLength: rawContent.length,
					truncated,
				})
			} finally {
				await browser.disconnect()
			}
		} catch (error) {
			return failure(
				`Failed to browse "${params.url}": ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Screenshot Tool - Take a screenshot of a URL and store it in R2.
 *
 * Uses Cloudflare Browser Rendering with SSRF protection.
 * Screenshots are stored at `ws/{workspaceId}/screenshots/{uuid}.png`.
 */
export const screenshotTool = createTool({
	id: 'screenshot',
	description:
		'Take a screenshot of a web page and store it in R2 storage. Returns the storage path for the screenshot.',
	inputSchema: z.object({
		url: z.string().url().describe('The URL to screenshot'),
		width: z
			.number()
			.optional()
			.default(1280)
			.describe('Viewport width in pixels (default: 1280)'),
		height: z
			.number()
			.optional()
			.default(720)
			.describe('Viewport height in pixels (default: 720)'),
		fullPage: z
			.boolean()
			.optional()
			.default(false)
			.describe('Capture the full scrollable page (default: false)'),
	}),
	outputSchema: ScreenshotOutputSchema,
	execute: async (params, context) => {
		if (!context.env.BROWSER) {
			return failure('Browser rendering binding not available')
		}

		if (!context.env.R2) {
			return failure('R2 storage not available for screenshot storage')
		}

		// Pre-navigation SSRF check
		const preCheck = isUrlSafe(params.url)
		if (!preCheck.safe) {
			return failure(`Blocked URL: ${preCheck.reason}`)
		}

		try {
			const puppeteer = await import('@cloudflare/puppeteer')
			const browser = await puppeteer.default.launch(context.env.BROWSER)

			try {
				const page = await browser.newPage()
				await page.setViewport({ width: params.width, height: params.height })
				await page.goto(params.url, { waitUntil: 'domcontentloaded' })

				// Post-navigation SSRF check
				const finalUrl = page.url()
				const postCheck = isUrlSafe(finalUrl)
				if (!postCheck.safe) {
					return failure(`Blocked after redirect: ${postCheck.reason}`)
				}

				const screenshot = await page.screenshot({
					fullPage: params.fullPage,
					type: 'png',
				})

				// Store in R2 at workspace-scoped path
				const screenshotId = crypto.randomUUID()
				const storagePath = `ws/${context.workspaceId}/screenshots/${screenshotId}.png`

				await context.env.R2.put(storagePath, screenshot, {
					httpMetadata: { contentType: 'image/png' },
					customMetadata: {
						sourceUrl: finalUrl,
						width: params.width.toString(),
						height: params.height.toString(),
					},
				})

				return success({
					url: finalUrl,
					storagePath,
					width: params.width,
					height: params.height,
					format: 'png' as const,
				})
			} finally {
				await browser.disconnect()
			}
		} catch (error) {
			return failure(
				`Failed to screenshot "${params.url}": ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Get all browser tools.
 */
export function getBrowserTools(_context: ToolContext) {
	return [browseUrlTool, screenshotTool]
}
