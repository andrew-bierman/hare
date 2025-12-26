import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from './types'

/**
 * Markdown Tool - Convert markdown to HTML or extract structure.
 */
export const markdownTool = createTool({
	id: 'markdown',
	description: 'Convert markdown to HTML or extract headings and links from markdown.',
	inputSchema: z.object({
		operation: z
			.enum(['toHtml', 'extractHeadings', 'extractLinks'])
			.describe('Operation to perform'),
		markdown: z.string().describe('Markdown text to process'),
	}),
	execute: async (params, _context) => {
		try {
			const { operation, markdown } = params

			switch (operation) {
				case 'toHtml': {
					let html = markdown
						// Headers
						.replace(/^### (.*$)/gm, '<h3>$1</h3>')
						.replace(/^## (.*$)/gm, '<h2>$1</h2>')
						.replace(/^# (.*$)/gm, '<h1>$1</h1>')
						// Bold and italic
						.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
						.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
						.replace(/\*(.*?)\*/g, '<em>$1</em>')
						// Links
						.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
						// Images
						.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
						// Code blocks
						.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
						// Inline code
						.replace(/`([^`]+)`/g, '<code>$1</code>')
						// Blockquotes
						.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
						// Horizontal rule
						.replace(/^---$/gm, '<hr />')
						// Line breaks
						.replace(/\n\n/g, '</p><p>')

					html = `<p>${html}</p>`.replace(/<p><\/p>/g, '')

					return success({ html, length: html.length })
				}

				case 'extractHeadings': {
					const headings: Array<{ level: number; text: string }> = []
					const regex = /^(#{1,6})\s+(.+)$/gm
					let match
					while ((match = regex.exec(markdown)) !== null) {
						headings.push({
							level: match[1]?.length || 1,
							text: match[2] || '',
						})
					}
					return success({ headings, count: headings.length })
				}

				case 'extractLinks': {
					const links: Array<{ text: string; url: string }> = []
					const regex = /\[([^\]]+)\]\(([^)]+)\)/g
					let match
					while ((match = regex.exec(markdown)) !== null) {
						links.push({
							text: match[1] || '',
							url: match[2] || '',
						})
					}
					return success({ links, count: links.length })
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`Markdown error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Diff Tool - Compare two texts and show differences.
 */
export const diffTool = createTool({
	id: 'diff',
	description: 'Compare two texts and show the differences between them.',
	inputSchema: z.object({
		text1: z.string().describe('First text'),
		text2: z.string().describe('Second text'),
		mode: z
			.enum(['lines', 'words', 'chars'])
			.optional()
			.default('lines')
			.describe('Comparison mode'),
	}),
	execute: async (params, _context) => {
		try {
			const { text1, text2, mode } = params

			const split = (text: string) => {
				switch (mode) {
					case 'lines':
						return text.split('\n')
					case 'words':
						return text.split(/\s+/)
					case 'chars':
						return text.split('')
					default:
						return text.split('\n')
				}
			}

			const parts1 = split(text1)
			const parts2 = split(text2)

			// Simple diff - find added, removed, and unchanged
			const added: string[] = []
			const removed: string[] = []
			const unchanged: string[] = []

			const set1 = new Set(parts1)
			const set2 = new Set(parts2)

			for (const part of parts1) {
				if (set2.has(part)) {
					unchanged.push(part)
				} else {
					removed.push(part)
				}
			}

			for (const part of parts2) {
				if (!set1.has(part)) {
					added.push(part)
				}
			}

			return success({
				added,
				removed,
				unchanged: unchanged.length,
				addedCount: added.length,
				removedCount: removed.length,
				mode,
			})
		} catch (error) {
			return failure(`Diff error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * QR Code Tool - Generate QR code data.
 */
export const qrcodeTool = createTool({
	id: 'qrcode',
	description: 'Generate QR code data as a URL for display or as SVG path data.',
	inputSchema: z.object({
		data: z.string().describe('Data to encode in the QR code'),
		size: z.number().optional().default(200).describe('Size in pixels'),
		format: z.enum(['url', 'svg']).optional().default('url').describe('Output format'),
	}),
	execute: async (params, _context) => {
		try {
			const { data, size, format } = params

			// Use a free QR code API for URL format
			if (format === 'url') {
				const encodedData = encodeURIComponent(data)
				const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`
				return success({
					url: qrUrl,
					data,
					size,
				})
			}

			// For SVG, generate a simple placeholder
			// In production, use a proper QR code library
			const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
				<rect width="100%" height="100%" fill="white"/>
				<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="10">
					QR: ${data.slice(0, 20)}${data.length > 20 ? '...' : ''}
				</text>
			</svg>`

			return success({
				svg,
				data,
				size,
			})
		} catch (error) {
			return failure(`QR Code error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Compression Tool - Compress and decompress text using various algorithms.
 */
export const compressionTool = createTool({
	id: 'compression',
	description: 'Compress or decompress text data. Uses base64 for transport.',
	inputSchema: z.object({
		operation: z.enum(['compress', 'decompress']).describe('Operation to perform'),
		data: z.string().describe('Data to compress/decompress'),
		algorithm: z
			.enum(['gzip', 'deflate'])
			.optional()
			.default('gzip')
			.describe('Compression algorithm'),
	}),
	execute: async (params, _context) => {
		try {
			const { operation, data, algorithm } = params

			if (operation === 'compress') {
				const encoder = new TextEncoder()
				const input = encoder.encode(data)

				const stream = new CompressionStream(algorithm)
				const writer = stream.writable.getWriter()
				writer.write(input)
				writer.close()

				const chunks: Uint8Array[] = []
				const reader = stream.readable.getReader()
				let result = await reader.read()
				while (!result.done) {
					chunks.push(result.value)
					result = await reader.read()
				}

				const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
				let offset = 0
				for (const chunk of chunks) {
					compressed.set(chunk, offset)
					offset += chunk.length
				}

				const base64 = btoa(String.fromCharCode(...compressed))

				return success({
					compressed: base64,
					originalSize: data.length,
					compressedSize: compressed.length,
					ratio: `${((1 - compressed.length / data.length) * 100).toFixed(1)}%`,
					algorithm,
				})
			}

			if (operation === 'decompress') {
				const binary = atob(data)
				const compressed = new Uint8Array(binary.length)
				for (let i = 0; i < binary.length; i++) {
					compressed[i] = binary.charCodeAt(i)
				}

				const stream = new DecompressionStream(algorithm)
				const writer = stream.writable.getWriter()
				writer.write(compressed)
				writer.close()

				const chunks: Uint8Array[] = []
				const reader = stream.readable.getReader()
				let result = await reader.read()
				while (!result.done) {
					chunks.push(result.value)
					result = await reader.read()
				}

				const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
				let offset = 0
				for (const chunk of chunks) {
					decompressed.set(chunk, offset)
					offset += chunk.length
				}

				const text = new TextDecoder().decode(decompressed)

				return success({
					decompressed: text,
					compressedSize: data.length,
					decompressedSize: text.length,
					algorithm,
				})
			}

			return failure(`Unknown operation: ${operation}`)
		} catch (error) {
			return failure(
				`Compression error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Color Tool - Convert between color formats.
 */
export const colorTool = createTool({
	id: 'color',
	description: 'Convert colors between hex, RGB, HSL formats and generate color palettes.',
	inputSchema: z.object({
		operation: z
			.enum(['hexToRgb', 'rgbToHex', 'hexToHsl', 'hslToHex', 'lighten', 'darken', 'complement'])
			.describe('Color operation'),
		color: z
			.string()
			.describe('Color value (hex: #ff0000, rgb: rgb(255,0,0), hsl: hsl(0,100%,50%))'),
		amount: z.number().optional().default(20).describe('Amount for lighten/darken (0-100)'),
	}),
	execute: async (params, _context) => {
		try {
			const { operation, color, amount } = params

			const hexToRgb = (hex: string) => {
				const cleaned = hex.replace('#', '')
				const r = parseInt(cleaned.slice(0, 2), 16)
				const g = parseInt(cleaned.slice(2, 4), 16)
				const b = parseInt(cleaned.slice(4, 6), 16)
				return { r, g, b }
			}

			const rgbToHex = (r: number, g: number, b: number) => {
				return (
					'#' +
					[r, g, b]
						.map((x) =>
							Math.max(0, Math.min(255, Math.round(x)))
								.toString(16)
								.padStart(2, '0'),
						)
						.join('')
				)
			}

			const rgbToHsl = (r: number, g: number, b: number) => {
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

				return {
					h: Math.round(h * 360),
					s: Math.round(s * 100),
					l: Math.round(l * 100),
				}
			}

			const hslToRgb = (h: number, s: number, l: number) => {
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

			switch (operation) {
				case 'hexToRgb': {
					const rgb = hexToRgb(color)
					return success({ ...rgb, rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` })
				}

				case 'rgbToHex': {
					const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
					if (!match) return failure('Invalid RGB format. Use rgb(r, g, b)')
					const hex = rgbToHex(
						parseInt(match[1] || '0', 10),
						parseInt(match[2] || '0', 10),
						parseInt(match[3] || '0', 10),
					)
					return success({ hex })
				}

				case 'hexToHsl': {
					const rgb = hexToRgb(color)
					const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
					return success({ ...hsl, hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` })
				}

				case 'hslToHex': {
					const match = color.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/)
					if (!match) return failure('Invalid HSL format. Use hsl(h, s%, l%)')
					const rgb = hslToRgb(
						parseInt(match[1] || '0', 10),
						parseInt(match[2] || '0', 10),
						parseInt(match[3] || '0', 10),
					)
					const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
					return success({ hex })
				}

				case 'lighten': {
					const rgb = hexToRgb(color)
					const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
					hsl.l = Math.min(100, hsl.l + amount)
					const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l)
					return success({
						original: color,
						result: rgbToHex(newRgb.r, newRgb.g, newRgb.b),
						amount,
					})
				}

				case 'darken': {
					const rgb = hexToRgb(color)
					const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
					hsl.l = Math.max(0, hsl.l - amount)
					const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l)
					return success({
						original: color,
						result: rgbToHex(newRgb.r, newRgb.g, newRgb.b),
						amount,
					})
				}

				case 'complement': {
					const rgb = hexToRgb(color)
					const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
					hsl.h = (hsl.h + 180) % 360
					const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l)
					return success({
						original: color,
						complement: rgbToHex(newRgb.r, newRgb.g, newRgb.b),
					})
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`Color error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Get all transform tools.
 */
export function getTransformTools(_context: ToolContext) {
	return [markdownTool, diffTool, qrcodeTool, compressionTool, colorTool]
}
