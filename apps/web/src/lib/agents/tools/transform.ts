import { z } from 'zod'
import MarkdownIt from 'markdown-it'
import { diffLines, diffWords, diffChars, type Change } from 'diff'
import QRCode from 'qrcode'
import Color from 'color'
import { createTool, failure, success, type ToolContext } from './types'

// Initialize markdown-it with GFM-like options
const md = new MarkdownIt({
	html: false,
	linkify: true,
	typographer: true,
})

/**
 * Markdown Tool - Uses markdown-it for proper CommonMark parsing
 */
export const markdownTool = createTool({
	id: 'markdown',
	description:
		'Parse Markdown to HTML or extract structure (headings, links, images, code blocks). Uses markdown-it for proper CommonMark support.',
	inputSchema: z.object({
		operation: z
			.enum([
				'toHtml',
				'toText',
				'extractHeadings',
				'extractLinks',
				'extractCodeBlocks',
				'extractAll',
			])
			.describe('Operation to perform'),
		markdown: z.string().describe('Markdown content to process'),
		options: z
			.object({
				sanitize: z.boolean().optional().default(true).describe('Sanitize HTML output'),
				gfm: z.boolean().optional().default(true).describe('Use GitHub Flavored Markdown'),
			})
			.optional(),
	}),
	execute: async (params, _context) => {
		const { operation, markdown } = params

		// Helper to extract headings from markdown
		const extractHeadings = (content: string): Array<{ level: number; text: string }> => {
			const headings: Array<{ level: number; text: string }> = []
			const regex = /^(#{1,6}) (.+)$/gm
			for (const match of content.matchAll(regex)) {
				const hashes = match[1]
				const text = match[2]
				if (hashes && text) {
					headings.push({ level: hashes.length, text: text.trim() })
				}
			}
			return headings
		}

		// Helper to extract links from markdown
		const extractLinks = (
			content: string,
		): Array<{ text: string; url: string; isImage: boolean }> => {
			const links: Array<{ text: string; url: string; isImage: boolean }> = []

			// Images
			const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
			for (const match of content.matchAll(imgRegex)) {
				const text = match[1]
				const url = match[2]
				if (text !== undefined && url) {
					links.push({ text, url, isImage: true })
				}
			}

			// Links (not images)
			const linkRegex = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g
			for (const match of content.matchAll(linkRegex)) {
				const text = match[1]
				const url = match[2]
				if (text && url) {
					links.push({ text, url, isImage: false })
				}
			}

			return links
		}

		// Helper to extract code blocks
		const extractCodeBlocks = (content: string): Array<{ language: string; code: string }> => {
			const blocks: Array<{ language: string; code: string }> = []
			const regex = /```(\w+)?\n([\s\S]*?)```/g
			for (const match of content.matchAll(regex)) {
				const code = match[2]
				if (code) {
					blocks.push({ language: match[1] ?? 'text', code: code.trim() })
				}
			}
			return blocks
		}

		switch (operation) {
			case 'toHtml':
				// Use markdown-it for proper CommonMark parsing
				return success({ html: md.render(markdown) })

			case 'toText': {
				// Render to HTML first, then strip tags for clean text
				const html = md.render(markdown)
				const text = html
					.replace(/<[^>]+>/g, ' ')
					.replace(/&nbsp;/g, ' ')
					.replace(/&amp;/g, '&')
					.replace(/&lt;/g, '<')
					.replace(/&gt;/g, '>')
					.replace(/&quot;/g, '"')
					.replace(/&#39;/g, "'")
					.replace(/\s+/g, ' ')
					.trim()
				return success({ text })
			}

			case 'extractHeadings':
				return success({ headings: extractHeadings(markdown) })

			case 'extractLinks':
				return success({ links: extractLinks(markdown) })

			case 'extractCodeBlocks':
				return success({ codeBlocks: extractCodeBlocks(markdown) })

			case 'extractAll':
				return success({
					headings: extractHeadings(markdown),
					links: extractLinks(markdown),
					codeBlocks: extractCodeBlocks(markdown),
				})

			default:
				return failure(`Unknown operation: ${operation}`)
		}
	},
})

/**
 * Diff Tool - Uses the diff library for robust text comparison
 */
export const diffTool = createTool({
	id: 'diff',
	description: 'Compare two texts and generate a diff. Shows additions, deletions, and changes.',
	inputSchema: z.object({
		original: z.string().describe('Original text'),
		modified: z.string().describe('Modified text'),
		mode: z
			.enum(['lines', 'words', 'chars'])
			.optional()
			.default('lines')
			.describe('Comparison mode'),
		context: z.number().optional().default(3).describe('Lines of context around changes'),
	}),
	execute: async (params, _context) => {
		const { original, modified, mode } = params

		// Use the diff library based on mode
		let diffResult: Change[]
		switch (mode) {
			case 'words':
				diffResult = diffWords(original, modified)
				break
			case 'chars':
				diffResult = diffChars(original, modified)
				break
			case 'lines':
			default:
				diffResult = diffLines(original, modified)
				break
		}

		// Transform to our format
		const changes = diffResult.map((change) => ({
			type: change.added ? 'add' : change.removed ? 'delete' : ('equal' as const),
			value: change.value,
			count: change.count,
		}))

		// Generate unified diff format for lines mode
		let unifiedDiff = ''
		if (mode === 'lines') {
			unifiedDiff = '--- original\n+++ modified\n'
			for (const change of diffResult) {
				const lines = change.value.split('\n').filter((l, i, arr) => i < arr.length - 1 || l)
				const prefix = change.added ? '+' : change.removed ? '-' : ' '
				for (const line of lines) {
					unifiedDiff += `${prefix}${line}\n`
				}
			}
		}

		// Statistics
		const stats = {
			additions: diffResult.filter((c) => c.added).reduce((acc, c) => acc + (c.count || 1), 0),
			deletions: diffResult.filter((c) => c.removed).reduce((acc, c) => acc + (c.count || 1), 0),
			unchanged: diffResult
				.filter((c) => !c.added && !c.removed)
				.reduce((acc, c) => acc + (c.count || 1), 0),
		}

		return success({
			changes,
			unifiedDiff: mode === 'lines' ? unifiedDiff : undefined,
			stats,
			mode,
		})
	},
})

/**
 * QR Code Tool - Uses qrcode library for proper Reed-Solomon encoding
 */
export const qrcodeTool = createTool({
	id: 'qrcode',
	description:
		'Generate QR codes as SVG with proper Reed-Solomon encoding. Can encode URLs, text, vCards, WiFi credentials, and more.',
	inputSchema: z.object({
		data: z.string().min(1).max(2000).describe('Data to encode in the QR code'),
		type: z
			.enum(['text', 'url', 'email', 'phone', 'sms', 'wifi', 'vcard'])
			.optional()
			.default('text')
			.describe('Data type'),
		size: z.number().optional().default(200).describe('QR code size in pixels'),
		errorCorrection: z
			.enum(['L', 'M', 'Q', 'H'])
			.optional()
			.default('M')
			.describe('Error correction level'),
		// Type-specific options
		wifiOptions: z
			.object({
				ssid: z.string(),
				password: z.string().optional(),
				encryption: z.enum(['WEP', 'WPA', 'nopass']).optional().default('WPA'),
				hidden: z.boolean().optional().default(false),
			})
			.optional(),
		vcardOptions: z
			.object({
				firstName: z.string(),
				lastName: z.string().optional(),
				phone: z.string().optional(),
				email: z.string().optional(),
				company: z.string().optional(),
				title: z.string().optional(),
				url: z.string().optional(),
			})
			.optional(),
	}),
	execute: async (params, _context) => {
		const { data, type, size, errorCorrection, wifiOptions, vcardOptions } = params

		// Format data based on type
		let formattedData = data
		switch (type) {
			case 'url':
				if (!data.startsWith('http://') && !data.startsWith('https://')) {
					formattedData = `https://${data}`
				}
				break
			case 'email':
				formattedData = `mailto:${data}`
				break
			case 'phone':
				formattedData = `tel:${data.replace(/[^\d+]/g, '')}`
				break
			case 'sms':
				formattedData = `sms:${data}`
				break
			case 'wifi':
				if (wifiOptions) {
					const { ssid, password, encryption, hidden } = wifiOptions
					formattedData = `WIFI:T:${encryption};S:${ssid};P:${password || ''};H:${hidden ? 'true' : 'false'};;`
				}
				break
			case 'vcard':
				if (vcardOptions) {
					const { firstName, lastName, phone, email, company, title, url } = vcardOptions
					formattedData = [
						'BEGIN:VCARD',
						'VERSION:3.0',
						`N:${lastName || ''};${firstName};;;`,
						`FN:${firstName}${lastName ? ` ${lastName}` : ''}`,
						phone ? `TEL:${phone}` : '',
						email ? `EMAIL:${email}` : '',
						company ? `ORG:${company}` : '',
						title ? `TITLE:${title}` : '',
						url ? `URL:${url}` : '',
						'END:VCARD',
					]
						.filter(Boolean)
						.join('\n')
				}
				break
		}

		try {
			// Use qrcode library for proper QR code generation
			const svg = await QRCode.toString(formattedData, {
				type: 'svg',
				width: size,
				errorCorrectionLevel: errorCorrection,
				margin: 1,
			})

			// Convert to base64 data URL
			const base64 = btoa(svg)
			const dataUrl = `data:image/svg+xml;base64,${base64}`

			return success({
				svg,
				dataUrl,
				size,
				type,
				data: formattedData,
				errorCorrectionLevel: errorCorrection,
			})
		} catch (error) {
			return failure(`QR code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Compression Tool - Compress and decompress data
 */
export const compressionTool = createTool({
	id: 'compression',
	description:
		'Compress or decompress data using gzip or deflate. Works with text or base64 binary data.',
	inputSchema: z.object({
		operation: z.enum(['compress', 'decompress']).describe('Operation to perform'),
		data: z.string().describe('Data to compress/decompress'),
		algorithm: z
			.enum(['gzip', 'deflate'])
			.optional()
			.default('gzip')
			.describe('Compression algorithm'),
		encoding: z
			.enum(['text', 'base64'])
			.optional()
			.default('text')
			.describe('Input/output encoding'),
	}),
	execute: async (params, _context) => {
		const { operation, data, algorithm, encoding } = params

		try {
			if (operation === 'compress') {
				// Convert input to Uint8Array
				let inputData: Uint8Array
				if (encoding === 'base64') {
					inputData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
				} else {
					inputData = new TextEncoder().encode(data)
				}

				// Create compression stream
				const cs = new CompressionStream(algorithm)
				const writer = cs.writable.getWriter()
				writer.write(inputData as Uint8Array<ArrayBuffer>)
				writer.close()

				// Read compressed data
				const reader = cs.readable.getReader()
				const chunks: Uint8Array[] = []
				let done = false
				while (!done) {
					const result = await reader.read()
					done = result.done
					if (result.value) chunks.push(result.value)
				}

				// Combine chunks
				const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
				const compressed = new Uint8Array(totalLength)
				let offset = 0
				for (const chunk of chunks) {
					compressed.set(chunk, offset)
					offset += chunk.length
				}

				const base64Output = btoa(String.fromCharCode(...compressed))

				return success({
					compressed: base64Output,
					originalSize: inputData.length,
					compressedSize: compressed.length,
					ratio: Math.round((1 - compressed.length / inputData.length) * 100),
					algorithm,
				})
			} else {
				// Decompress
				const compressedData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))

				const ds = new DecompressionStream(algorithm)
				const writer = ds.writable.getWriter()
				writer.write(compressedData)
				writer.close()

				const reader = ds.readable.getReader()
				const chunks: Uint8Array[] = []
				let done = false
				while (!done) {
					const result = await reader.read()
					done = result.done
					if (result.value) chunks.push(result.value)
				}

				const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
				const decompressed = new Uint8Array(totalLength)
				let offset = 0
				for (const chunk of chunks) {
					decompressed.set(chunk, offset)
					offset += chunk.length
				}

				const output =
					encoding === 'base64'
						? btoa(String.fromCharCode(...decompressed))
						: new TextDecoder().decode(decompressed)

				return success({
					decompressed: output,
					compressedSize: compressedData.length,
					decompressedSize: decompressed.length,
					algorithm,
				})
			}
		} catch (error) {
			return failure(
				`Compression error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Color Tool - Uses color library for robust color manipulation
 */
export const colorTool = createTool({
	id: 'color',
	description:
		'Convert between color formats (hex, rgb, hsl) and perform color operations (lighten, darken, blend). Uses the color library for accurate color space conversions.',
	inputSchema: z.object({
		operation: z
			.enum(['convert', 'lighten', 'darken', 'blend', 'complement', 'palette', 'contrast'])
			.describe('Operation'),
		color: z.string().describe('Color value (hex, rgb, hsl, or named color)'),
		format: z
			.enum(['hex', 'rgb', 'hsl', 'all'])
			.optional()
			.default('hex')
			.describe('Output format'),
		amount: z.number().optional().default(0.2).describe('Amount for lighten/darken (0-1)'),
		color2: z.string().optional().describe('Second color for blend operation'),
		blendRatio: z.number().optional().default(0.5).describe('Blend ratio (0-1)'),
	}),
	execute: async (params, _context) => {
		const { operation, color, format, amount, color2, blendRatio } = params

		// Helper to format output using color library
		const formatOutput = (c: ReturnType<typeof Color>, fmt: string) => {
			const hex = c.hex()
			const rgbStr = c.rgb().string()
			const hslStr = c.hsl().string()

			if (fmt === 'all') {
				return { hex, rgb: rgbStr, hsl: hslStr }
			}
			switch (fmt) {
				case 'rgb':
					return rgbStr
				case 'hsl':
					return hslStr
				default:
					return hex
			}
		}

		try {
			// Parse color using color library (supports many formats)
			const colorObj = Color(color)

			switch (operation) {
				case 'convert':
					return success({ input: color, output: formatOutput(colorObj, format) })

				case 'lighten': {
					const lightened = colorObj.lighten(amount)
					return success({ input: color, output: formatOutput(lightened, format), amount })
				}

				case 'darken': {
					const darkened = colorObj.darken(amount)
					return success({ input: color, output: formatOutput(darkened, format), amount })
				}

				case 'complement': {
					const complemented = colorObj.rotate(180)
					return success({ input: color, complement: formatOutput(complemented, format) })
				}

				case 'blend': {
					if (!color2) return failure('Second color required for blend')
					try {
						const color2Obj = Color(color2)
						const blended = colorObj.mix(color2Obj, blendRatio)
						return success({
							color1: color,
							color2,
							ratio: blendRatio,
							blended: formatOutput(blended, format),
						})
					} catch {
						return failure(`Invalid second color: ${color2}`)
					}
				}

				case 'palette': {
					const palette = []
					for (let i = 0; i < 5; i++) {
						const adjustedAmount = (i - 2) * 0.15
						const adjusted =
							adjustedAmount > 0 ? colorObj.lighten(adjustedAmount) : colorObj.darken(-adjustedAmount)
						palette.push(adjusted.hex())
					}
					return success({ baseColor: color, palette })
				}

				case 'contrast': {
					const lum = colorObj.luminosity()
					const whiteColor = Color('#ffffff')
					const blackColor = Color('#000000')

					const contrastWithWhite = colorObj.contrast(whiteColor)
					const contrastWithBlack = colorObj.contrast(blackColor)

					return success({
						color,
						luminance: Math.round(lum * 1000) / 1000,
						contrastWithWhite: Math.round(contrastWithWhite * 100) / 100,
						contrastWithBlack: Math.round(contrastWithBlack * 100) / 100,
						recommendedTextColor: contrastWithWhite > contrastWithBlack ? '#ffffff' : '#000000',
						wcagAALarge: Math.max(contrastWithWhite, contrastWithBlack) >= 3,
						wcagAA: Math.max(contrastWithWhite, contrastWithBlack) >= 4.5,
						wcagAAA: Math.max(contrastWithWhite, contrastWithBlack) >= 7,
					})
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`Invalid color: ${color}. ${error instanceof Error ? error.message : ''}`)
		}
	},
})

/**
 * Get all transform tools
 */
export function getTransformTools(_context: ToolContext) {
	return [markdownTool, diffTool, qrcodeTool, compressionTool, colorTool]
}
