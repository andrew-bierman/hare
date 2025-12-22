import { z } from 'zod'
import { marked } from 'marked'
import QRCode from 'qrcode-svg'
import { diffLines, diffWords, diffChars, Change } from 'diff'
import { createTool, success, failure, type ToolContext } from './types'

/**
 * Markdown Tool - Parse and render Markdown using marked library
 */
export const markdownTool = createTool({
	id: 'markdown',
	description: 'Parse Markdown to HTML or extract structure (headings, links, images, code blocks). Uses marked library with full GFM support.',
	inputSchema: z.object({
		operation: z.enum(['toHtml', 'toText', 'extractHeadings', 'extractLinks', 'extractCodeBlocks', 'extractAll']).describe('Operation to perform'),
		markdown: z.string().describe('Markdown content to process'),
		options: z
			.object({
				gfm: z.boolean().optional().default(true).describe('Use GitHub Flavored Markdown'),
				breaks: z.boolean().optional().default(false).describe('Convert line breaks to <br>'),
			})
			.optional(),
	}),
	execute: async (params, context) => {
		const { operation, markdown, options } = params
		const { gfm = true, breaks = false } = options || {}

		// Configure marked
		marked.setOptions({ gfm, breaks })

		const extractHeadings = (md: string): Array<{ level: number; text: string }> => {
			const headings: Array<{ level: number; text: string }> = []
			const regex = /^(#{1,6}) (.+)$/gm
			let match
			while ((match = regex.exec(md)) !== null) {
				headings.push({ level: match[1].length, text: match[2] })
			}
			return headings
		}

		const extractLinks = (md: string): Array<{ text: string; url: string; isImage: boolean }> => {
			const links: Array<{ text: string; url: string; isImage: boolean }> = []

			// Images
			const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
			let match
			while ((match = imgRegex.exec(md)) !== null) {
				links.push({ text: match[1], url: match[2], isImage: true })
			}

			// Links
			const linkRegex = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g
			while ((match = linkRegex.exec(md)) !== null) {
				links.push({ text: match[1], url: match[2], isImage: false })
			}

			return links
		}

		const extractCodeBlocks = (md: string): Array<{ language: string; code: string }> => {
			const blocks: Array<{ language: string; code: string }> = []
			const regex = /```(\w+)?\n([\s\S]*?)```/g
			let match
			while ((match = regex.exec(md)) !== null) {
				blocks.push({ language: match[1] || 'text', code: match[2].trim() })
			}
			return blocks
		}

		switch (operation) {
			case 'toHtml':
				const html = await marked.parse(markdown)
				return success({ html })

			case 'toText':
				// Strip all markdown syntax
				let text = markdown
					.replace(/```[\s\S]*?```/g, '') // Remove code blocks
					.replace(/`[^`]+`/g, '') // Remove inline code
					.replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
					.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links to text
					.replace(/^#{1,6} /gm, '') // Remove heading markers
					.replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
					.replace(/\*([^*]+)\*/g, '$1') // Italic
					.replace(/__([^_]+)__/g, '$1')
					.replace(/_([^_]+)_/g, '$1')
					.replace(/~~([^~]+)~~/g, '$1') // Strikethrough
					.replace(/^[-*+] /gm, '') // List items
					.replace(/^\d+\. /gm, '')
					.replace(/^> /gm, '') // Blockquotes
					.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '') // HR
					.trim()
				return success({ text })

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
 * Diff Tool - Compare texts and generate diffs using jsdiff library
 */
export const diffTool = createTool({
	id: 'diff',
	description: 'Compare two texts and generate a diff. Shows additions, deletions, and changes using battle-tested diff algorithms.',
	inputSchema: z.object({
		original: z.string().describe('Original text'),
		modified: z.string().describe('Modified text'),
		mode: z.enum(['lines', 'words', 'chars']).optional().default('lines').describe('Comparison mode'),
	}),
	execute: async (params, context) => {
		const { original, modified, mode } = params

		// Use the appropriate diff function based on mode
		let changes: Change[]
		switch (mode) {
			case 'words':
				changes = diffWords(original, modified)
				break
			case 'chars':
				changes = diffChars(original, modified)
				break
			case 'lines':
			default:
				changes = diffLines(original, modified)
				break
		}

		// Transform to our output format
		const formattedChanges = changes.map((change) => ({
			type: change.added ? 'add' : change.removed ? 'delete' : 'equal',
			value: change.value,
			count: change.count,
		}))

		// Generate unified diff format for lines mode
		let unifiedDiff = ''
		if (mode === 'lines') {
			unifiedDiff = '--- original\n+++ modified\n'
			for (const change of changes) {
				const prefix = change.added ? '+' : change.removed ? '-' : ' '
				const lines = change.value.split('\n').filter((line, idx, arr) =>
					// Don't add empty line at the end
					!(idx === arr.length - 1 && line === '')
				)
				for (const line of lines) {
					unifiedDiff += `${prefix}${line}\n`
				}
			}
		}

		// Statistics
		const stats = {
			additions: changes.filter((c) => c.added).reduce((sum, c) => sum + (c.count || 1), 0),
			deletions: changes.filter((c) => c.removed).reduce((sum, c) => sum + (c.count || 1), 0),
			unchanged: changes.filter((c) => !c.added && !c.removed).reduce((sum, c) => sum + (c.count || 1), 0),
		}

		return success({
			changes: formattedChanges,
			unifiedDiff: mode === 'lines' ? unifiedDiff : undefined,
			stats,
			mode,
		})
	},
})

/**
 * QR Code Tool - Generate QR codes as SVG using qrcode-svg library
 */
export const qrcodeTool = createTool({
	id: 'qrcode',
	description: 'Generate valid, scannable QR codes as SVG. Can encode URLs, text, vCards, WiFi credentials, and more.',
	inputSchema: z.object({
		data: z.string().min(1).max(2000).describe('Data to encode in the QR code'),
		type: z.enum(['text', 'url', 'email', 'phone', 'sms', 'wifi', 'vcard']).optional().default('text').describe('Data type'),
		size: z.number().optional().default(200).describe('QR code size in pixels'),
		errorCorrection: z.enum(['L', 'M', 'Q', 'H']).optional().default('M').describe('Error correction level'),
		padding: z.number().optional().default(4).describe('Padding around QR code (in modules)'),
		color: z.string().optional().default('#000000').describe('QR code color'),
		background: z.string().optional().default('#ffffff').describe('Background color'),
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
	execute: async (params, context) => {
		const { data, type, size, errorCorrection, padding, color, background, wifiOptions, vcardOptions } = params

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
						`FN:${firstName}${lastName ? ' ' + lastName : ''}`,
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
			// Generate QR code using qrcode-svg library
			const qr = new QRCode({
				content: formattedData,
				width: size,
				height: size,
				padding: padding,
				color: color,
				background: background,
				ecl: errorCorrection,
			})

			const svg = qr.svg()

			// Convert to base64 data URL
			const base64 = btoa(svg)
			const dataUrl = `data:image/svg+xml;base64,${base64}`

			return success({
				svg,
				dataUrl,
				size,
				type,
				data: formattedData,
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
	description: 'Compress or decompress data using gzip or deflate. Works with text or base64 binary data.',
	inputSchema: z.object({
		operation: z.enum(['compress', 'decompress']).describe('Operation to perform'),
		data: z.string().describe('Data to compress/decompress'),
		algorithm: z.enum(['gzip', 'deflate']).optional().default('gzip').describe('Compression algorithm'),
		encoding: z.enum(['text', 'base64']).optional().default('text').describe('Input/output encoding'),
	}),
	execute: async (params, context) => {
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
				writer.write(inputData)
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

				const output = encoding === 'base64' ? btoa(String.fromCharCode(...decompressed)) : new TextDecoder().decode(decompressed)

				return success({
					decompressed: output,
					compressedSize: compressedData.length,
					decompressedSize: decompressed.length,
					algorithm,
				})
			}
		} catch (error) {
			return failure(`Compression error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Color Tool - Convert and manipulate colors
 */
export const colorTool = createTool({
	id: 'color',
	description: 'Convert between color formats (hex, rgb, hsl) and perform color operations (lighten, darken, blend).',
	inputSchema: z.object({
		operation: z.enum(['convert', 'lighten', 'darken', 'blend', 'complement', 'palette', 'contrast']).describe('Operation'),
		color: z.string().describe('Color value (hex, rgb, hsl, or named color)'),
		format: z.enum(['hex', 'rgb', 'hsl', 'all']).optional().default('hex').describe('Output format'),
		amount: z.number().optional().default(0.2).describe('Amount for lighten/darken (0-1)'),
		color2: z.string().optional().describe('Second color for blend operation'),
		blendRatio: z.number().optional().default(0.5).describe('Blend ratio (0-1)'),
	}),
	execute: async (params, context) => {
		const { operation, color, format, amount, color2, blendRatio } = params

		// Parse color to RGB
		const parseColor = (c: string): { r: number; g: number; b: number } | null => {
			// Hex
			const hexMatch = c.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
			if (hexMatch) {
				return {
					r: parseInt(hexMatch[1], 16),
					g: parseInt(hexMatch[2], 16),
					b: parseInt(hexMatch[3], 16),
				}
			}

			// Short hex
			const shortHexMatch = c.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i)
			if (shortHexMatch) {
				return {
					r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
					g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
					b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16),
				}
			}

			// RGB
			const rgbMatch = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i)
			if (rgbMatch) {
				return {
					r: parseInt(rgbMatch[1], 10),
					g: parseInt(rgbMatch[2], 10),
					b: parseInt(rgbMatch[3], 10),
				}
			}

			// Named colors
			const namedColors: Record<string, { r: number; g: number; b: number }> = {
				red: { r: 255, g: 0, b: 0 },
				green: { r: 0, g: 128, b: 0 },
				blue: { r: 0, g: 0, b: 255 },
				white: { r: 255, g: 255, b: 255 },
				black: { r: 0, g: 0, b: 0 },
				yellow: { r: 255, g: 255, b: 0 },
				cyan: { r: 0, g: 255, b: 255 },
				magenta: { r: 255, g: 0, b: 255 },
			}

			return namedColors[c.toLowerCase()] || null
		}

		// RGB to HSL
		const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
			r /= 255
			g /= 255
			b /= 255
			const max = Math.max(r, g, b)
			const min = Math.min(r, g, b)
			let h = 0
			let s = 0
			const l = (max + min) / 2

			if (max !== min) {
				const d = max - min
				s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
				switch (max) {
					case r:
						h = ((g - b) / d + (g < b ? 6 : 0)) / 6
						break
					case g:
						h = ((b - r) / d + 2) / 6
						break
					case b:
						h = ((r - g) / d + 4) / 6
						break
				}
			}

			return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
		}

		// HSL to RGB
		const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
			h /= 360
			s /= 100
			l /= 100

			let r, g, b

			if (s === 0) {
				r = g = b = l
			} else {
				const hue2rgb = (p: number, q: number, t: number) => {
					if (t < 0) t += 1
					if (t > 1) t -= 1
					if (t < 1 / 6) return p + (q - p) * 6 * t
					if (t < 1 / 2) return q
					if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
					return p
				}

				const q = l < 0.5 ? l * (1 + s) : l + s - l * s
				const p = 2 * l - q
				r = hue2rgb(p, q, h + 1 / 3)
				g = hue2rgb(p, q, h)
				b = hue2rgb(p, q, h - 1 / 3)
			}

			return {
				r: Math.round(r * 255),
				g: Math.round(g * 255),
				b: Math.round(b * 255),
			}
		}

		// Format output
		const formatOutput = (rgb: { r: number; g: number; b: number }, fmt: string) => {
			const hex = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`
			const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
			const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
			const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`

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

		const rgb = parseColor(color)
		if (!rgb) {
			return failure(`Invalid color: ${color}`)
		}

		switch (operation) {
			case 'convert':
				return success({ input: color, output: formatOutput(rgb, format) })

			case 'lighten': {
				const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
				hsl.l = Math.min(100, hsl.l + amount * 100)
				const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l)
				return success({ input: color, output: formatOutput(newRgb, format), amount })
			}

			case 'darken': {
				const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
				hsl.l = Math.max(0, hsl.l - amount * 100)
				const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l)
				return success({ input: color, output: formatOutput(newRgb, format), amount })
			}

			case 'complement': {
				const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
				hsl.h = (hsl.h + 180) % 360
				const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l)
				return success({ input: color, complement: formatOutput(newRgb, format) })
			}

			case 'blend': {
				if (!color2) return failure('Second color required for blend')
				const rgb2 = parseColor(color2)
				if (!rgb2) return failure(`Invalid second color: ${color2}`)

				const blended = {
					r: Math.round(rgb.r * (1 - blendRatio) + rgb2.r * blendRatio),
					g: Math.round(rgb.g * (1 - blendRatio) + rgb2.g * blendRatio),
					b: Math.round(rgb.b * (1 - blendRatio) + rgb2.b * blendRatio),
				}
				return success({ color1: color, color2, ratio: blendRatio, blended: formatOutput(blended, format) })
			}

			case 'palette': {
				const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
				const palette = []
				for (let i = 0; i < 5; i++) {
					const newL = Math.max(0, Math.min(100, hsl.l + (i - 2) * 15))
					const newRgb = hslToRgb(hsl.h, hsl.s, newL)
					palette.push(formatOutput(newRgb, 'hex'))
				}
				return success({ baseColor: color, palette })
			}

			case 'contrast': {
				// Calculate relative luminance
				const luminance = (r: number, g: number, b: number): number => {
					const [rs, gs, bs] = [r, g, b].map((c) => {
						c /= 255
						return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
					})
					return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
				}

				const lum = luminance(rgb.r, rgb.g, rgb.b)
				const whiteLum = 1
				const blackLum = 0

				const contrastWithWhite = (whiteLum + 0.05) / (lum + 0.05)
				const contrastWithBlack = (lum + 0.05) / (blackLum + 0.05)

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
	},
})

/**
 * Get all transform tools
 */
export function getTransformTools(context: ToolContext) {
	return [markdownTool, diffTool, qrcodeTool, compressionTool, colorTool]
}
