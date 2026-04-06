import { z } from 'zod'
import { ContentLengths, Timeouts, UserAgents } from './constants'
import { createTool, failure, success, type ToolContext, type ToolResult } from './types'

// ============================================================================
// Output Schemas
// ============================================================================

/** RSS feed item schema for Atom feeds */
const AtomEntrySchema = z.object({
	title: z.string(),
	link: z.string(),
	published: z.string(),
	summary: z.string(),
	content: z.string().optional(),
	author: z.string().optional(),
})

/** RSS feed item schema for RSS 2.0 feeds */
const RssItemSchema = z.object({
	title: z.string(),
	link: z.string(),
	pubDate: z.string(),
	description: z.string(),
	content: z.string().optional(),
	author: z.string().optional(),
	categories: z.array(z.string()).optional(),
})

/** RSS tool output schema */
const RssOutputSchema = z.object({
	type: z.enum(['atom', 'rss']),
	title: z.string(),
	link: z.string().nullable(),
	updated: z.string().nullable().optional(),
	description: z.string().optional(),
	lastBuildDate: z.string().nullable().optional(),
	items: z.array(z.union([AtomEntrySchema, RssItemSchema])),
	itemCount: z.number(),
	fetchedAt: z.string(),
})

/** Scrape tool link schema */
const ScrapeLinkSchema = z.object({
	text: z.string(),
	href: z.string(),
})

/** Scrape tool image schema */
const ScrapeImageSchema = z.object({
	src: z.string(),
	alt: z.string(),
})

/** Scrape tool heading schema */
const ScrapeHeadingSchema = z.object({
	level: z.number(),
	text: z.string(),
})

/** Scrape tool meta schema */
const ScrapeMetaSchema = z.object({
	title: z.string(),
	description: z.string(),
	keywords: z.string(),
	ogTitle: z.string(),
	ogDescription: z.string(),
	ogImage: z.string(),
})

/** Scrape tool output schema - union of possible outputs */
const ScrapeOutputSchema = z
	.object({
		url: z.string(),
		fetchedAt: z.string(),
		// Optional fields based on extraction type
		text: z.string().optional(),
		links: z.array(ScrapeLinkSchema).optional(),
		images: z.array(ScrapeImageSchema).optional(),
		headings: z.array(ScrapeHeadingSchema).optional(),
		meta: ScrapeMetaSchema.optional(),
		selector: z.string().optional(),
		matches: z.array(z.string()).optional(),
	})
	.passthrough()

/** Regex test operation output */
const RegexTestOutputSchema = z.object({
	matches: z.boolean(),
	pattern: z.string(),
	flags: z.string(),
})

/** Regex match operation output */
const RegexMatchOutputSchema = z.object({
	match: z.string().nullable(),
	found: z.boolean(),
	index: z.number().optional(),
	groups: z.record(z.string(), z.string()).optional(),
})

/** Regex matchAll operation output */
const RegexMatchAllOutputSchema = z.object({
	matches: z.array(
		z.object({
			match: z.string(),
			index: z.number(),
			groups: z.record(z.string(), z.string()).optional(),
		}),
	),
	count: z.number(),
})

/** Regex replace operation output */
const RegexReplaceOutputSchema = z.object({
	result: z.string(),
	originalLength: z.number(),
	newLength: z.number(),
	changed: z.boolean(),
})

/** Regex split operation output */
const RegexSplitOutputSchema = z.object({
	parts: z.array(z.string()),
	count: z.number(),
})

/** Regex extract operation output */
const RegexExtractOutputSchema = z.object({
	extracted: z.array(z.record(z.string(), z.string())),
	count: z.number(),
})

/** Regex tool output schema - union of all operations */
const RegexOutputSchema = z.union([
	RegexTestOutputSchema,
	RegexMatchOutputSchema,
	RegexMatchAllOutputSchema,
	RegexReplaceOutputSchema,
	RegexSplitOutputSchema,
	RegexExtractOutputSchema,
])

/** Crypto generateKey operation output */
const CryptoGenerateKeyOutputSchema = z.object({
	key: z.string(),
	algorithm: z.literal('AES-GCM'),
	keyLength: z.literal(256),
})

/** Crypto randomBytes operation output */
const CryptoRandomBytesOutputSchema = z.object({
	hex: z.string(),
	base64: z.string(),
	bytes: z.number(),
})

/** Crypto encrypt operation output */
const CryptoEncryptOutputSchema = z.object({
	encrypted: z.string(),
	iv: z.string(),
	algorithm: z.literal('AES-GCM'),
})

/** Crypto decrypt operation output */
const CryptoDecryptOutputSchema = z.object({
	decrypted: z.string(),
	algorithm: z.literal('AES-GCM'),
})

/** Crypto tool output schema - union of all operations */
const CryptoOutputSchema = z.union([
	CryptoGenerateKeyOutputSchema,
	CryptoRandomBytesOutputSchema,
	CryptoEncryptOutputSchema,
	CryptoDecryptOutputSchema,
])

/** JSON Schema validation error */
const JsonSchemaErrorSchema = z.object({
	path: z.string(),
	message: z.string(),
})

/** JSON Schema tool output schema */
const JsonSchemaOutputSchema = z.object({
	valid: z.boolean(),
	errors: z.array(JsonSchemaErrorSchema),
	errorCount: z.number(),
})

/** CSV parse operation output */
const CsvParseOutputSchema = z.object({
	data: z.array(z.record(z.string(), z.string())),
	headers: z.array(z.string()).optional(),
	rowCount: z.number(),
})

/** CSV stringify operation output */
const CsvStringifyOutputSchema = z.object({
	csv: z.string(),
	headers: z.array(z.string()).optional(),
	rowCount: z.number(),
})

/** CSV tool output schema - union of operations */
const CsvOutputSchema = z.union([CsvParseOutputSchema, CsvStringifyOutputSchema])

/** Template tool output schema */
const TemplateOutputSchema = z.object({
	result: z.string(),
	missingVariables: z.array(z.string()),
	variableCount: z.number(),
})

/**
 * RSS Feed Tool - Fetch and parse RSS/Atom feeds.
 */
export const rssTool = createTool({
	id: 'rss',
	description: 'Fetch and parse RSS or Atom feeds. Returns structured feed data with items.',
	inputSchema: z.object({
		url: z.string().url().describe('URL of the RSS/Atom feed'),
		limit: z.number().optional().default(10).describe('Maximum number of items to return'),
		includeContent: z.boolean().optional().default(false).describe('Include full content of items'),
	}),
	outputSchema: RssOutputSchema,
	execute: async (params, _context) => {
		try {
			const { url, limit, includeContent } = params

			const response = await fetch(url, {
				headers: {
					'User-Agent': UserAgents.RSS,
					Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
				},
			})

			if (!response.ok) {
				return failure(`Failed to fetch feed: ${response.status} ${response.statusText}`)
			}

			const xml = await response.text()

			// Simple XML parser for RSS/Atom
			const parseXml = (_text: string) => {
				const getTagContent = (tag: string, content: string): string | null => {
					const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
					const match = content.match(regex)
					return match?.[1]?.trim() ?? null
				}

				const getCdataContent = (text: string): string => {
					const cdataMatch = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
					return cdataMatch?.[1] ?? text.replace(/<[^>]+>/g, '').trim()
				}

				const getAttr = (tag: string, attr: string, content: string): string | null => {
					const regex = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i')
					const match = content.match(regex)
					return match?.[1] ?? null
				}

				// Detect feed type
				const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"')

				if (isAtom) {
					// Parse Atom feed
					const title = getTagContent('title', xml)
					const link = getAttr('link', 'href', xml)
					const updated = getTagContent('updated', xml)

					const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi
					const entries: Array<{
						title: string
						link: string
						published: string
						summary: string
						content?: string
						author?: string
					}> = []

					let match: RegExpExecArray | null = entryRegex.exec(xml)
					while (match !== null && entries.length < limit) {
						const entry = match[1] ?? ''
						entries.push({
							title: getCdataContent(getTagContent('title', entry) ?? ''),
							link: getAttr('link', 'href', entry) ?? getTagContent('id', entry) ?? '',
							published: getTagContent('published', entry) ?? getTagContent('updated', entry) ?? '',
							summary: getCdataContent(getTagContent('summary', entry) ?? ''),
							...(includeContent && {
								content: getCdataContent(getTagContent('content', entry) ?? ''),
							}),
							author: getTagContent('name', getTagContent('author', entry) ?? '') ?? undefined,
						})
						match = entryRegex.exec(xml)
					}

					return {
						type: 'atom' as const,
						title: getCdataContent(title ?? ''),
						link,
						updated,
						items: entries,
					}
				} else {
					// Parse RSS 2.0 feed
					const channel = getTagContent('channel', xml) || xml
					const title = getTagContent('title', channel)
					const link = getTagContent('link', channel)
					const description = getTagContent('description', channel)
					const lastBuildDate = getTagContent('lastBuildDate', channel)

					const itemRegex = /<item>([\s\S]*?)<\/item>/gi
					const items: Array<{
						title: string
						link: string
						pubDate: string
						description: string
						content?: string
						author?: string
						categories?: string[]
					}> = []

					let match: RegExpExecArray | null = itemRegex.exec(xml)
					while (match !== null && items.length < limit) {
						const item = match[1] ?? ''

						// Extract categories
						const categories: string[] = []
						const catRegex = /<category[^>]*>([^<]+)<\/category>/gi
						for (const catMatch of item.matchAll(catRegex)) {
							if (catMatch[1]) {
								categories.push(getCdataContent(catMatch[1]))
							}
						}

						items.push({
							title: getCdataContent(getTagContent('title', item) ?? ''),
							link: getTagContent('link', item) ?? getTagContent('guid', item) ?? '',
							pubDate: getTagContent('pubDate', item) ?? '',
							description: getCdataContent(getTagContent('description', item) ?? ''),
							...(includeContent && {
								content: getCdataContent(
									getTagContent('content:encoded', item) ??
										getTagContent('description', item) ??
										'',
								),
							}),
							author:
								getTagContent('author', item) ?? getTagContent('dc:creator', item) ?? undefined,
							...(categories.length > 0 && { categories }),
						})
						match = itemRegex.exec(xml)
					}

					return {
						type: 'rss' as const,
						title: getCdataContent(title ?? ''),
						link,
						description: getCdataContent(description ?? ''),
						lastBuildDate,
						items,
					}
				}
			}

			const feed = parseXml(xml)

			return success({
				...feed,
				itemCount: feed.items.length,
				fetchedAt: new Date().toISOString(),
			})
		} catch (error) {
			return failure(`RSS error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Web Scrape Tool - Extract content from web pages.
 */
export const scrapeTool = createTool({
	id: 'scrape',
	description:
		'Fetch a web page and extract text content. Can extract specific elements by CSS-like patterns or get clean text.',
	inputSchema: z.object({
		url: z.string().url().describe('URL of the web page to scrape'),
		extract: z
			.enum(['text', 'links', 'images', 'headings', 'meta', 'all'])
			.optional()
			.default('text')
			.describe('What to extract from the page'),
		selector: z
			.string()
			.optional()
			.describe('CSS-like selector pattern to extract specific content'),
		maxLength: z
			.number()
			.optional()
			.default(ContentLengths.SCRAPE)
			.describe('Maximum content length to return'),
		timeout: z
			.number()
			.optional()
			.default(Timeouts.SCRAPE_DEFAULT)
			.describe('Request timeout in milliseconds'),
	}),
	outputSchema: ScrapeOutputSchema,
	execute: async (params, _context) => {
		try {
			const { url, extract, selector, maxLength, timeout } = params

			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), timeout)

			const response = await fetch(url, {
				headers: {
					'User-Agent': UserAgents.WEB_SCRAPE,
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				},
				signal: controller.signal,
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				return failure(`Failed to fetch page: ${response.status} ${response.statusText}`)
			}

			const html = await response.text()

			// Helper functions for HTML parsing
			const extractText = (html: string): string => {
				// Remove scripts, styles, and comments
				const text = html
					.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
					.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
					.replace(/<!--[\s\S]*?-->/g, '')
					.replace(/<[^>]+>/g, ' ')
					.replace(/&nbsp;/g, ' ')
					.replace(/&amp;/g, '&')
					.replace(/&lt;/g, '<')
					.replace(/&gt;/g, '>')
					.replace(/&quot;/g, '"')
					.replace(/&#39;/g, "'")
					.replace(/\s+/g, ' ')
					.trim()

				return text.slice(0, maxLength)
			}

			const extractLinks = (html: string): Array<{ text: string; href: string }> => {
				const links: Array<{ text: string; href: string }> = []
				const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi
				for (const match of html.matchAll(regex)) {
					const href = match[1]
					const text = match[2]?.trim()
					if (href && text) {
						links.push({ href, text })
					}
				}
				return links.slice(0, 100)
			}

			const extractImages = (html: string): Array<{ src: string; alt: string }> => {
				const images: Array<{ src: string; alt: string }> = []
				const regex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi
				for (const match of html.matchAll(regex)) {
					const src = match[1]
					if (src) {
						images.push({
							src,
							alt: match[2] ?? '',
						})
					}
				}
				return images.slice(0, 50)
			}

			const extractHeadings = (html: string): Array<{ level: number; text: string }> => {
				const headings: Array<{ level: number; text: string }> = []
				const regex = /<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/gi
				for (const match of html.matchAll(regex)) {
					const level = match[1]
					const text = match[2]?.trim()
					if (level && text) {
						headings.push({
							level: Number.parseInt(level, 10),
							text,
						})
					}
				}
				return headings
			}

			const extractMeta = (
				html: string,
			): {
				title: string
				description: string
				keywords: string
				ogTitle: string
				ogDescription: string
				ogImage: string
			} => {
				const getMetaContent = (name: string): string => {
					const regex = new RegExp(
						`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
						'i',
					)
					const match = html.match(regex)
					return match?.[1] ?? ''
				}

				const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)

				return {
					title: titleMatch?.[1]?.trim() ?? '',
					description: getMetaContent('description'),
					keywords: getMetaContent('keywords'),
					ogTitle: getMetaContent('og:title'),
					ogDescription: getMetaContent('og:description'),
					ogImage: getMetaContent('og:image'),
				}
			}

			const extractBySelector = (html: string, sel: string): string[] => {
				// Simple selector support: tag, .class, #id
				const results: string[] = []
				let regex: RegExp

				if (sel.startsWith('#')) {
					// ID selector
					const id = sel.slice(1)
					regex = new RegExp(`<[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)</[^>]+>`, 'gi')
				} else if (sel.startsWith('.')) {
					// Class selector
					const className = sel.slice(1)
					regex = new RegExp(
						`<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)</[^>]+>`,
						'gi',
					)
				} else {
					// Tag selector
					regex = new RegExp(`<${sel}[^>]*>([\\s\\S]*?)</${sel}>`, 'gi')
				}

				for (const match of html.matchAll(regex)) {
					const content = match[1]
					if (content) {
						results.push(extractText(content))
					}
				}

				return results.slice(0, 20)
			}

			let result: Record<string, unknown> = {}

			if (selector) {
				result = { selector, matches: extractBySelector(html, selector) }
			} else {
				switch (extract) {
					case 'text':
						result = { text: extractText(html) }
						break
					case 'links':
						result = { links: extractLinks(html) }
						break
					case 'images':
						result = { images: extractImages(html) }
						break
					case 'headings':
						result = { headings: extractHeadings(html) }
						break
					case 'meta':
						result = { meta: extractMeta(html) }
						break
					case 'all':
						result = {
							meta: extractMeta(html),
							headings: extractHeadings(html),
							text: extractText(html),
							links: extractLinks(html).slice(0, 20),
							images: extractImages(html).slice(0, 10),
						}
						break
				}
			}

			return success({
				url,
				...result,
				fetchedAt: new Date().toISOString(),
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return failure(`Request timed out after ${params.timeout}ms`)
			}
			return failure(`Scrape error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Regex Tool - Test, match, and replace using regular expressions.
 */
export const regexTool = createTool({
	id: 'regex',
	description:
		'Work with regular expressions: test patterns, find matches, extract groups, or replace text.',
	inputSchema: z.object({
		operation: z
			.enum(['test', 'match', 'matchAll', 'replace', 'split', 'extract'])
			.describe('Regex operation'),
		text: z.string().describe('Text to operate on'),
		pattern: z.string().describe('Regular expression pattern'),
		flags: z.string().optional().default('g').describe('Regex flags (g, i, m, s, u)'),
		replacement: z.string().optional().describe('Replacement string for replace operation'),
		groupNames: z.array(z.string()).optional().describe('Names for captured groups in extract'),
	}),
	outputSchema: RegexOutputSchema,
	execute: async (params, _context): Promise<ToolResult<z.infer<typeof RegexOutputSchema>>> => {
		try {
			const { operation, text, pattern, flags, replacement, groupNames } = params

			// Validate and create regex
			let regex: RegExp
			try {
				regex = new RegExp(pattern, flags)
			} catch (e) {
				return failure(`Invalid regex pattern: ${e instanceof Error ? e.message : 'Unknown error'}`)
			}

			switch (operation) {
				case 'test': {
					const matches = regex.test(text)
					return success({
						matches,
						pattern,
						flags,
					})
				}

				case 'match': {
					const match = text.match(regex)
					return success({
						match: match ? match[0] : null,
						found: match !== null,
						index: match?.index,
						groups: match?.groups,
					})
				}

				case 'matchAll': {
					const matches: Array<{
						match: string
						index: number
						groups: Record<string, string> | undefined
					}> = []

					// Ensure global flag for matchAll
					const globalRegex = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`)

					for (const match of text.matchAll(globalRegex)) {
						matches.push({
							match: match[0],
							index: match.index || 0,
							groups: match.groups,
						})
					}

					return success({
						matches,
						count: matches.length,
					})
				}

				case 'replace': {
					if (replacement === undefined) {
						return failure('Replacement string required for replace operation')
					}
					const result = text.replace(regex, replacement)
					return success({
						result,
						originalLength: text.length,
						newLength: result.length,
						changed: result !== text,
					})
				}

				case 'split': {
					const parts = text.split(regex)
					return success({
						parts,
						count: parts.length,
					})
				}

				case 'extract': {
					// Extract all captured groups
					const globalRegex = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`)
					const extracted: Array<Record<string, string>> = []

					for (const match of text.matchAll(globalRegex)) {
						if (match.groups) {
							extracted.push(match.groups)
						} else if (match.length > 1) {
							// Unnamed groups
							const obj: Record<string, string> = {}
							for (let i = 1; i < match.length; i++) {
								const name = groupNames?.[i - 1] ?? `group${i}`
								const value = match[i]
								if (value !== undefined) {
									obj[name] = value
								}
							}
							extracted.push(obj)
						}
					}

					return success({
						extracted,
						count: extracted.length,
					})
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`Regex error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Crypto Tool - Encryption and decryption utilities.
 */
export const cryptoTool = createTool({
	id: 'crypto',
	description: 'Encrypt or decrypt data using AES-GCM. Generate secure random values.',
	inputSchema: z.object({
		operation: z
			.enum(['encrypt', 'decrypt', 'generateKey', 'randomBytes'])
			.describe('Crypto operation'),
		data: z.string().optional().describe('Data to encrypt/decrypt'),
		key: z.string().optional().describe('Base64-encoded encryption key (256-bit)'),
		iv: z.string().optional().describe('Base64-encoded initialization vector (for decrypt)'),
		bytes: z.number().optional().default(32).describe('Number of random bytes to generate'),
	}),
	outputSchema: CryptoOutputSchema,
	execute: async (params, _context): Promise<ToolResult<z.infer<typeof CryptoOutputSchema>>> => {
		try {
			const { operation, data, key, iv, bytes } = params

			switch (operation) {
				case 'generateKey': {
					const cryptoKey = await crypto.subtle.generateKey(
						{ name: 'AES-GCM', length: 256 },
						true,
						['encrypt', 'decrypt'],
					)
					const exported = await crypto.subtle.exportKey('raw', cryptoKey)
					const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)))

					return success({
						key: keyBase64,
						algorithm: 'AES-GCM',
						keyLength: 256,
					})
				}

				case 'randomBytes': {
					const randomData = new Uint8Array(bytes)
					crypto.getRandomValues(randomData)
					const hex = Array.from(randomData)
						.map((b) => b.toString(16).padStart(2, '0'))
						.join('')
					const base64 = btoa(String.fromCharCode(...randomData))

					return success({
						hex,
						base64,
						bytes: randomData.length,
					})
				}

				case 'encrypt': {
					if (!data) return failure('Data required for encryption')
					if (!key) return failure('Key required for encryption')

					const keyBytes = Uint8Array.from(atob(key), (c) => c.charCodeAt(0))
					const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
						'encrypt',
					])

					const ivBytes = new Uint8Array(12)
					crypto.getRandomValues(ivBytes)

					const encoder = new TextEncoder()
					const dataBytes = encoder.encode(data)

					const encrypted = await crypto.subtle.encrypt(
						{ name: 'AES-GCM', iv: ivBytes },
						cryptoKey,
						dataBytes,
					)

					const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)))
					const ivBase64 = btoa(String.fromCharCode(...ivBytes))

					return success({
						encrypted: encryptedBase64,
						iv: ivBase64,
						algorithm: 'AES-GCM',
					})
				}

				case 'decrypt': {
					if (!data) return failure('Encrypted data required for decryption')
					if (!key) return failure('Key required for decryption')
					if (!iv) return failure('IV required for decryption')

					const keyBytes = Uint8Array.from(atob(key), (c) => c.charCodeAt(0))
					const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
						'decrypt',
					])

					const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))
					const encryptedBytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))

					const decrypted = await crypto.subtle.decrypt(
						{ name: 'AES-GCM', iv: ivBytes },
						cryptoKey,
						encryptedBytes,
					)

					const decoder = new TextDecoder()
					const decryptedText = decoder.decode(decrypted)

					return success({
						decrypted: decryptedText,
						algorithm: 'AES-GCM',
					})
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`Crypto error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * JSON Schema Validation Tool - Validate data against JSON Schema.
 */
export const jsonSchemaTool = createTool({
	id: 'json_schema',
	description: 'Validate JSON data against a JSON Schema. Returns validation results and errors.',
	inputSchema: z.object({
		data: z.unknown().describe('Data to validate'),
		schema: z
			.object({
				type: z.string().optional(),
				properties: z.record(z.string(), z.unknown()).optional(),
				required: z.array(z.string()).optional(),
				items: z.unknown().optional(),
				minLength: z.number().optional(),
				maxLength: z.number().optional(),
				minimum: z.number().optional(),
				maximum: z.number().optional(),
				pattern: z.string().optional(),
				enum: z.array(z.unknown()).optional(),
			})
			.passthrough()
			.describe('JSON Schema to validate against'),
	}),
	outputSchema: JsonSchemaOutputSchema,
	execute: async (params, _context) => {
		try {
			const { data, schema } = params

			const errors: Array<{ path: string; message: string }> = []

			const validate = (
				value: unknown,
				schemaNode: Record<string, unknown>,
				path: string = '',
			): boolean => {
				// Type validation
				if (schemaNode.type) {
					const expectedType = schemaNode.type as string
					const actualType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value

					if (expectedType !== actualType) {
						errors.push({
							path: path || 'root',
							message: `Expected ${expectedType}, got ${actualType}`,
						})
						return false
					}
				}

				// Enum validation
				if (schemaNode.enum) {
					const enumValues = schemaNode.enum as unknown[]
					if (!enumValues.includes(value)) {
						errors.push({
							path: path || 'root',
							message: `Value must be one of: ${enumValues.join(', ')}`,
						})
						return false
					}
				}

				// String validations
				if (typeof value === 'string') {
					if (
						schemaNode.minLength !== undefined &&
						value.length < (schemaNode.minLength as number)
					) {
						errors.push({ path, message: `String too short (min: ${schemaNode.minLength})` })
					}
					if (
						schemaNode.maxLength !== undefined &&
						value.length > (schemaNode.maxLength as number)
					) {
						errors.push({ path, message: `String too long (max: ${schemaNode.maxLength})` })
					}
					if (schemaNode.pattern) {
						const regex = new RegExp(schemaNode.pattern as string)
						if (!regex.test(value)) {
							errors.push({ path, message: `String does not match pattern: ${schemaNode.pattern}` })
						}
					}
				}

				// Number validations
				if (typeof value === 'number') {
					if (schemaNode.minimum !== undefined && value < (schemaNode.minimum as number)) {
						errors.push({ path, message: `Number too small (min: ${schemaNode.minimum})` })
					}
					if (schemaNode.maximum !== undefined && value > (schemaNode.maximum as number)) {
						errors.push({ path, message: `Number too large (max: ${schemaNode.maximum})` })
					}
				}

				// Object validations
				if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
					const obj = value as Record<string, unknown>

					// Required properties
					if (schemaNode.required) {
						for (const req of schemaNode.required as string[]) {
							if (!(req in obj)) {
								errors.push({
									path: path ? `${path}.${req}` : req,
									message: 'Required property missing',
								})
							}
						}
					}

					// Property validation
					if (schemaNode.properties) {
						const props = schemaNode.properties as Record<string, unknown>
						for (const [key, propSchema] of Object.entries(props)) {
							if (key in obj) {
								validate(
									obj[key],
									propSchema as Record<string, unknown>,
									path ? `${path}.${key}` : key,
								)
							}
						}
					}
				}

				// Array validations
				if (Array.isArray(value)) {
					if (schemaNode.items) {
						const itemSchema = schemaNode.items as Record<string, unknown>
						value.forEach((item, index) => {
							validate(item, itemSchema, `${path}[${index}]`)
						})
					}
				}

				return errors.length === 0
			}

			const isValid = validate(data, schema)

			return success({
				valid: isValid,
				errors: isValid ? [] : errors,
				errorCount: errors.length,
			})
		} catch (error) {
			return failure(
				`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * CSV Tool - Parse and generate CSV data.
 */
export const csvTool = createTool({
	id: 'csv',
	description: 'Parse CSV text to JSON or convert JSON arrays to CSV format.',
	inputSchema: z.object({
		operation: z.enum(['parse', 'stringify']).describe('CSV operation'),
		data: z
			.union([z.string(), z.array(z.record(z.string(), z.unknown()))])
			.describe('CSV string to parse or array of objects to stringify'),
		options: z
			.object({
				delimiter: z.string().optional().default(','),
				headers: z.boolean().optional().default(true),
				customHeaders: z.array(z.string()).optional(),
				skipEmptyLines: z.boolean().optional().default(true),
			})
			.optional(),
	}),
	outputSchema: CsvOutputSchema,
	execute: async (params, _context): Promise<ToolResult<z.infer<typeof CsvOutputSchema>>> => {
		try {
			const { operation, data, options } = params
			const {
				delimiter = ',',
				headers = true,
				customHeaders,
				skipEmptyLines = true,
			} = options || {}

			if (operation === 'parse') {
				if (typeof data !== 'string') {
					return failure('Parse requires a CSV string')
				}

				const lines = data.split(/\r?\n/).filter((line) => !skipEmptyLines || line.trim())
				if (lines.length === 0) {
					return success({ data: [], rowCount: 0 })
				}

				const parseRow = (row: string): string[] => {
					const result: string[] = []
					let current = ''
					let inQuotes = false

					for (let i = 0; i < row.length; i++) {
						const char = row[i]
						const nextChar = row[i + 1]

						if (inQuotes) {
							if (char === '"' && nextChar === '"') {
								current += '"'
								i++
							} else if (char === '"') {
								inQuotes = false
							} else {
								current += char
							}
						} else {
							if (char === '"') {
								inQuotes = true
							} else if (char === delimiter) {
								result.push(current)
								current = ''
							} else {
								current += char
							}
						}
					}
					result.push(current)
					return result
				}

				let headerRow: string[]
				let dataLines: string[]

				const firstLine = lines[0] ?? ''

				if (headers) {
					headerRow = customHeaders ?? parseRow(firstLine)
					dataLines = lines.slice(1)
				} else if (customHeaders) {
					headerRow = customHeaders
					dataLines = lines
				} else {
					// Generate default headers
					const firstRow = parseRow(firstLine)
					headerRow = firstRow.map((_, i) => `column${i + 1}`)
					dataLines = lines
				}

				const parsed = dataLines.map((line) => {
					const values = parseRow(line)
					const obj: Record<string, string> = {}
					headerRow.forEach((header, i) => {
						obj[header] = values[i] || ''
					})
					return obj
				})

				return success({
					data: parsed,
					headers: headerRow,
					rowCount: parsed.length,
				})
			}

			if (operation === 'stringify') {
				if (!Array.isArray(data)) {
					return failure('Stringify requires an array of objects')
				}

				if (data.length === 0) {
					return success({ csv: '', rowCount: 0 })
				}

				const escapeValue = (val: unknown): string => {
					const str = String(val ?? '')
					if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
						return `"${str.replace(/"/g, '""')}"`
					}
					return str
				}

				const headerRow = customHeaders || Object.keys(data[0] as object)
				const rows = [
					...(headers ? [headerRow.join(delimiter)] : []),
					...data.map((row) => {
						const obj = row as Record<string, unknown>
						return headerRow.map((h) => escapeValue(obj[h])).join(delimiter)
					}),
				]

				const csv = rows.join('\n')

				return success({
					csv,
					headers: headerRow,
					rowCount: data.length,
				})
			}

			return failure(`Unknown operation: ${operation}`)
		} catch (error) {
			return failure(`CSV error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Template Tool - Render templates with variable substitution.
 */
export const templateTool = createTool({
	id: 'template',
	description:
		'Render templates with variable substitution. Supports Mustache-like {{variable}} syntax.',
	inputSchema: z.object({
		template: z.string().describe('Template string with {{variable}} placeholders'),
		variables: z.record(z.string(), z.unknown()).describe('Variables to substitute'),
		options: z
			.object({
				missingBehavior: z.enum(['empty', 'keep', 'error']).optional().default('empty'),
				escapeHtml: z.boolean().optional().default(false),
			})
			.optional(),
	}),
	outputSchema: TemplateOutputSchema,
	execute: async (params, _context) => {
		try {
			const { template, variables, options } = params
			const { missingBehavior = 'empty', escapeHtml = false } = options || {}

			const escapeHtmlFn = (str: string): string => {
				return str
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;')
					.replace(/"/g, '&quot;')
					.replace(/'/g, '&#39;')
			}

			const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
				return path.split('.').reduce((current, key) => {
					if (current && typeof current === 'object' && key in current) {
						return (current as Record<string, unknown>)[key]
					}
					return undefined
				}, obj as unknown)
			}

			const missingVars: string[] = []

			const result = template.replace(/\{\{([^}]+)\}\}/g, (match, varName: string) => {
				const trimmedName = varName.trim()
				const value = getNestedValue(variables, trimmedName)

				if (value === undefined) {
					missingVars.push(trimmedName)
					switch (missingBehavior) {
						case 'keep':
							return match
						case 'error':
							throw new Error(`Missing variable: ${trimmedName}`)
						default:
							return ''
					}
				}

				let strValue = String(value)
				if (escapeHtml) {
					strValue = escapeHtmlFn(strValue)
				}
				return strValue
			})

			return success({
				result,
				missingVariables: missingVars,
				variableCount: Object.keys(variables).length,
			})
		} catch (error) {
			return failure(`Template error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Get all data tools.
 */
export function getDataTools(_context: ToolContext) {
	return [rssTool, scrapeTool, regexTool, cryptoTool, jsonSchemaTool, csvTool, templateTool]
}
