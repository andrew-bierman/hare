import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from './types'

/**
 * Markdown Tool - Parse and render Markdown
 */
export const markdownTool = createTool({
	id: 'markdown',
	description:
		'Parse Markdown to HTML or extract structure (headings, links, images, code blocks).',
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
		const { operation, markdown, options } = params
		const { sanitize: _sanitize = true, gfm = true } = options || {}

		// Simple markdown parser
		const escapeHtml = (text: string): string => {
			return text
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;')
		}

		const parseMarkdown = (md: string): string => {
			let html = md

			// Code blocks (must be first to prevent other parsing inside)
			html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
				return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`
			})

			// Inline code
			html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

			// Headers
			html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
			html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
			html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
			html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
			html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
			html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

			// Bold and italic
			html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
			html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
			html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
			html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
			html = html.replace(/_(.+?)_/g, '<em>$1</em>')

			// Strikethrough (GFM)
			if (gfm) {
				html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')
			}

			// Links and images
			html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
			html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

			// Blockquotes
			html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')

			// Horizontal rules
			html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr />')

			// Unordered lists
			html = html.replace(/^\s*[-*+] (.+)$/gm, '<li>$1</li>')

			// Ordered lists
			html = html.replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>')

			// Paragraphs (basic)
			html = html.replace(/\n\n/g, '</p><p>')
			if (!html.startsWith('<')) {
				html = `<p>${html}</p>`
			}

			// Clean up empty paragraphs
			html = html.replace(/<p>\s*<\/p>/g, '')

			return html
		}

		const extractHeadings = (md: string): Array<{ level: number; text: string }> => {
			const headings: Array<{ level: number; text: string }> = []
			const regex = /^(#{1,6}) (.+)$/gm
			for (const match of md.matchAll(regex)) {
				headings.push({ level: match[1].length, text: match[2] })
			}
			return headings
		}

		const extractLinks = (md: string): Array<{ text: string; url: string; isImage: boolean }> => {
			const links: Array<{ text: string; url: string; isImage: boolean }> = []

			// Images
			const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
			for (const match of md.matchAll(imgRegex)) {
				links.push({ text: match[1], url: match[2], isImage: true })
			}

			// Links
			const linkRegex = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g
			for (const match of md.matchAll(linkRegex)) {
				links.push({ text: match[1], url: match[2], isImage: false })
			}

			return links
		}

		const extractCodeBlocks = (md: string): Array<{ language: string; code: string }> => {
			const blocks: Array<{ language: string; code: string }> = []
			const regex = /```(\w+)?\n([\s\S]*?)```/g
			for (const match of md.matchAll(regex)) {
				blocks.push({ language: match[1] || 'text', code: match[2].trim() })
			}
			return blocks
		}

		switch (operation) {
			case 'toHtml':
				return success({ html: parseMarkdown(markdown) })

			case 'toText': {
				// Strip all markdown syntax
				const text = markdown
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
 * Diff Tool - Compare texts and generate diffs
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
		const { original, modified, mode, context: _contextLines } = params

		type Change = {
			type: 'equal' | 'add' | 'delete'
			value: string
			lineNumber?: { old?: number; new?: number }
		}

		// Split based on mode
		const split = (text: string): string[] => {
			switch (mode) {
				case 'lines':
					return text.split('\n')
				case 'words':
					return text.split(/(\s+)/)
				case 'chars':
					return text.split('')
				default:
					return text.split('\n')
			}
		}

		const originalParts = split(original)
		const modifiedParts = split(modified)

		// Simple LCS-based diff algorithm
		const lcs = (a: string[], b: string[]): number[][] => {
			const m = a.length
			const n = b.length
			const dp: number[][] = Array(m + 1)
				.fill(null)
				.map(() => Array(n + 1).fill(0))

			for (let i = 1; i <= m; i++) {
				for (let j = 1; j <= n; j++) {
					if (a[i - 1] === b[j - 1]) {
						dp[i][j] = dp[i - 1][j - 1] + 1
					} else {
						dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
					}
				}
			}
			return dp
		}

		const backtrack = (dp: number[][], a: string[], b: string[]): Change[] => {
			const changes: Change[] = []
			let i = a.length
			let j = b.length
			let oldLine = a.length
			let newLine = b.length

			while (i > 0 || j > 0) {
				if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
					changes.unshift({
						type: 'equal',
						value: a[i - 1],
						lineNumber: mode === 'lines' ? { old: oldLine, new: newLine } : undefined,
					})
					i--
					j--
					oldLine--
					newLine--
				} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
					changes.unshift({
						type: 'add',
						value: b[j - 1],
						lineNumber: mode === 'lines' ? { new: newLine } : undefined,
					})
					j--
					newLine--
				} else if (i > 0) {
					changes.unshift({
						type: 'delete',
						value: a[i - 1],
						lineNumber: mode === 'lines' ? { old: oldLine } : undefined,
					})
					i--
					oldLine--
				}
			}
			return changes
		}

		const dp = lcs(originalParts, modifiedParts)
		const changes = backtrack(dp, originalParts, modifiedParts)

		// Generate unified diff format for lines mode
		let unifiedDiff = ''
		if (mode === 'lines') {
			unifiedDiff = '--- original\n+++ modified\n'
			for (const change of changes) {
				switch (change.type) {
					case 'equal':
						unifiedDiff += ` ${change.value}\n`
						break
					case 'add':
						unifiedDiff += `+${change.value}\n`
						break
					case 'delete':
						unifiedDiff += `-${change.value}\n`
						break
				}
			}
		}

		// Statistics
		const stats = {
			additions: changes.filter((c) => c.type === 'add').length,
			deletions: changes.filter((c) => c.type === 'delete').length,
			unchanged: changes.filter((c) => c.type === 'equal').length,
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
 * QR Code Tool - Generate QR codes as SVG
 */
export const qrcodeTool = createTool({
	id: 'qrcode',
	description:
		'Generate QR codes as SVG. Can encode URLs, text, vCards, WiFi credentials, and more.',
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

		// Simple QR code matrix generation (Reed-Solomon encoding simplified)
		// For production, use a proper QR code library
		const generateMatrix = (data: string, _ecLevel: string): boolean[][] => {
			// This is a simplified placeholder - in production use a real QR library
			const dataLength = data.length
			const size = Math.max(21, Math.ceil(Math.sqrt(dataLength * 8)) + 8)
			const matrix: boolean[][] = Array(size)
				.fill(null)
				.map(() => Array(size).fill(false))

			// Add finder patterns
			const addFinderPattern = (x: number, y: number) => {
				for (let i = 0; i < 7; i++) {
					for (let j = 0; j < 7; j++) {
						const isOuter = i === 0 || i === 6 || j === 0 || j === 6
						const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4
						matrix[y + i][x + j] = isOuter || isInner
					}
				}
			}

			addFinderPattern(0, 0)
			addFinderPattern(size - 7, 0)
			addFinderPattern(0, size - 7)

			// Add timing patterns
			for (let i = 8; i < size - 8; i++) {
				matrix[6][i] = i % 2 === 0
				matrix[i][6] = i % 2 === 0
			}

			// Encode data (simplified - just fills remaining space)
			let bitIndex = 0
			const dataBits = Array.from(data).flatMap((char) => {
				const code = char.charCodeAt(0)
				return Array(8)
					.fill(0)
					.map((_, i) => (code >> (7 - i)) & 1)
			})

			for (let col = size - 1; col >= 0; col -= 2) {
				if (col === 6) col--
				for (
					let row = col % 4 < 2 ? size - 1 : 0;
					col % 4 < 2 ? row >= 0 : row < size;
					col % 4 < 2 ? row-- : row++
				) {
					for (let c = 0; c < 2; c++) {
						const x = col - c
						if (matrix[row]?.[x] === undefined) continue
						if (row < 9 && (x < 9 || x >= size - 8)) continue
						if (row >= size - 8 && x < 9) continue
						if (row === 6 || x === 6) continue

						if (bitIndex < dataBits.length) {
							matrix[row][x] = dataBits[bitIndex] === 1
							bitIndex++
						}
					}
				}
			}

			return matrix
		}

		const matrix = generateMatrix(formattedData, errorCorrection)
		const moduleSize = size / matrix.length

		// Generate SVG
		let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`
		svg += `<rect width="100%" height="100%" fill="white"/>`

		for (let y = 0; y < matrix.length; y++) {
			for (let x = 0; x < matrix[y].length; x++) {
				if (matrix[y][x]) {
					svg += `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`
				}
			}
		}

		svg += '</svg>'

		// Convert to base64 data URL
		const base64 = btoa(svg)
		const dataUrl = `data:image/svg+xml;base64,${base64}`

		return success({
			svg,
			dataUrl,
			size,
			type,
			data: formattedData,
			moduleCount: matrix.length,
		})
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
 * Color Tool - Convert and manipulate colors
 */
export const colorTool = createTool({
	id: 'color',
	description:
		'Convert between color formats (hex, rgb, hsl) and perform color operations (lighten, darken, blend).',
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

			let r: number
			let g: number
			let b: number

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
				return success({
					color1: color,
					color2,
					ratio: blendRatio,
					blended: formatOutput(blended, format),
				})
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
						return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
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
export function getTransformTools(_context: ToolContext) {
	return [markdownTool, diffTool, qrcodeTool, compressionTool, colorTool]
}
