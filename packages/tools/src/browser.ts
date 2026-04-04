/**
 * Browser Rendering Tools
 *
 * Tools for web scraping, screenshots, and content extraction
 * using Cloudflare Browser Rendering (headless Chromium).
 *
 * Security: All URLs are validated before and after navigation
 * to prevent SSRF attacks including redirect-based bypasses.
 */

import puppeteer from '@cloudflare/puppeteer'
import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from './types'
import { isBrowserUrlSafe } from './security/ssrf'

// ============================================================================
// Constants
// ============================================================================

const NAVIGATION_TIMEOUT_MS = 15_000
const SELECTOR_TIMEOUT_MS = 5_000
const MAX_CONTENT_LENGTH = 50_000 // ~50KB text content limit

// ============================================================================
// Output Schemas
// ============================================================================

const BrowseUrlOutputSchema = z.object({
	url: z.string().describe('Final URL after any redirects'),
	content: z.string().describe('Extracted text content'),
	truncated: z.boolean().describe('Whether content was truncated'),
})

const ScreenshotOutputSchema = z.object({
	url: z.string().describe('Final URL of the page'),
	r2Key: z.string().describe('R2 key where screenshot is stored'),
	width: z.number().describe('Screenshot width in pixels'),
	height: z.number().describe('Screenshot height in pixels'),
})

// ============================================================================
// Tools
// ============================================================================

/**
 * Browse URL Tool
 *
 * Navigate to a URL and extract its text content.
 * Includes SSRF protection with pre and post-navigation checks.
 */
export const browseUrlTool = createTool({
	id: 'browse_url',
	description:
		'Browse a URL and extract its text content. Useful for reading web pages, documentation, or articles.',
	inputSchema: z.object({
		url: z.string().url().describe('The URL to browse'),
		waitFor: z
			.string()
			.optional()
			.describe('CSS selector to wait for before extracting content'),
	}),
	outputSchema: BrowseUrlOutputSchema,
	execute: async (params, context) => {
		if (!context.env.BROWSER) return failure('Browser binding not available')

		// Pre-navigation SSRF check
		const preCheck = isBrowserUrlSafe(params.url)
		if (!preCheck.safe) return failure(`URL blocked: ${preCheck.reason}`)

		try {
			const browser = await puppeteer.launch(context.env.BROWSER)
			try {
				const page = await browser.newPage()
				await page.goto(params.url, {
					timeout: NAVIGATION_TIMEOUT_MS,
					waitUntil: 'domcontentloaded',
				})

				// Post-navigation SSRF check: verify final URL after redirects
				const finalUrl = page.url()
				const postCheck = isBrowserUrlSafe(finalUrl)
				if (!postCheck.safe) {
					return failure(`Redirected to blocked URL: ${postCheck.reason}`)
				}

				if (params.waitFor) {
					await page.waitForSelector(params.waitFor, { timeout: SELECTOR_TIMEOUT_MS })
				}

				// Extract text content safely
				const content = await page.evaluate(() => {
					// Remove script and style elements before extraction
					for (const el of document.querySelectorAll('script, style, noscript')) el.remove()
					return document.body.innerText || ''
				})

				const truncated = content.length > MAX_CONTENT_LENGTH
				return success({
					url: finalUrl,
					content: content.slice(0, MAX_CONTENT_LENGTH),
					truncated,
				})
			} finally {
				await browser.disconnect() // disconnect instead of close for session reuse
			}
		} catch (error) {
			return failure(
				`Failed to browse URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Screenshot Tool
 *
 * Take a screenshot of a web page and store it in R2.
 */
export const screenshotTool = createTool({
	id: 'screenshot',
	description:
		'Take a screenshot of a web page and store it in R2. Returns the R2 key for the image.',
	inputSchema: z.object({
		url: z.string().url().describe('The URL to screenshot'),
		fullPage: z.boolean().optional().default(false).describe('Capture the full scrollable page'),
	}),
	outputSchema: ScreenshotOutputSchema,
	execute: async (params, context) => {
		if (!context.env.BROWSER) return failure('Browser binding not available')
		if (!context.env.R2) return failure('R2 bucket not available')

		const preCheck = isBrowserUrlSafe(params.url)
		if (!preCheck.safe) return failure(`URL blocked: ${preCheck.reason}`)

		try {
			const browser = await puppeteer.launch(context.env.BROWSER)
			try {
				const page = await browser.newPage()
				await page.setViewport({ width: 1280, height: 1024 })
				await page.goto(params.url, {
					timeout: NAVIGATION_TIMEOUT_MS,
					waitUntil: 'domcontentloaded',
				})

				const finalUrl = page.url()
				const postCheck = isBrowserUrlSafe(finalUrl)
				if (!postCheck.safe) {
					return failure(`Redirected to blocked URL: ${postCheck.reason}`)
				}

				const screenshot = await page.screenshot({
					fullPage: params.fullPage,
					type: 'png',
				})

				// Store in R2 with workspace-scoped path
				const key = `ws/${context.workspaceId}/screenshots/${crypto.randomUUID()}.png`
				await context.env.R2.put(key, screenshot)

				return success({
					url: finalUrl,
					r2Key: key,
					width: 1280,
					height: 1024,
				})
			} finally {
				await browser.disconnect()
			}
		} catch (error) {
			return failure(
				`Failed to take screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

// ============================================================================
// Tool Getter
// ============================================================================

export function getBrowserTools(_context: ToolContext) {
	return [browseUrlTool, screenshotTool]
}
