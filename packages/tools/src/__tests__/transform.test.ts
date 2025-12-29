import { describe, expect, it, beforeEach } from 'vitest'
import {
	markdownTool,
	diffTool,
	qrcodeTool,
	compressionTool,
	colorTool,
	getTransformTools,
} from '../transform'
import type { ToolContext } from '../types'

const createMockContext = (): ToolContext => ({
	env: {} as ToolContext['env'],
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

describe('Transform Tools', () => {
	let context: ToolContext

	beforeEach(() => {
		context = createMockContext()
	})

	describe('markdownTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(markdownTool.id).toBe('markdown')
			})

			it('validates toHtml operation', () => {
				const result = markdownTool.inputSchema.safeParse({
					operation: 'toHtml',
					markdown: '# Hello',
				})
				expect(result.success).toBe(true)
			})

			it('validates extractHeadings operation', () => {
				const result = markdownTool.inputSchema.safeParse({
					operation: 'extractHeadings',
					markdown: '# Title\n## Subtitle',
				})
				expect(result.success).toBe(true)
			})

			it('validates with options', () => {
				const result = markdownTool.inputSchema.safeParse({
					operation: 'toHtml',
					markdown: '# Hello',
					options: { sanitize: true, gfm: true },
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution - toHtml', () => {
			it('converts heading to HTML', async () => {
				const result = await markdownTool.execute(
					{ operation: 'toHtml', markdown: '# Hello World' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.html).toContain('<h1>Hello World</h1>')
			})

			it('converts bold text to HTML', async () => {
				const result = await markdownTool.execute(
					{ operation: 'toHtml', markdown: '**bold text**' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.html).toContain('<strong>bold text</strong>')
			})

			it('converts italic text to HTML', async () => {
				const result = await markdownTool.execute(
					{ operation: 'toHtml', markdown: '*italic text*' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.html).toContain('<em>italic text</em>')
			})

			it('converts links to HTML', async () => {
				const result = await markdownTool.execute(
					{ operation: 'toHtml', markdown: '[link](https://example.com)' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.html).toContain('<a href="https://example.com">link</a>')
			})

			it('converts code blocks to HTML', async () => {
				const result = await markdownTool.execute(
					{ operation: 'toHtml', markdown: '```javascript\nconst x = 1;\n```' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.html).toContain('<pre><code')
				expect(result.data?.html).toContain('language-javascript')
			})

			it('handles GFM strikethrough', async () => {
				const result = await markdownTool.execute(
					{
						operation: 'toHtml',
						markdown: '~~deleted~~',
						options: { gfm: true },
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.html).toContain('<del>deleted</del>')
			})
		})

		describe('execution - toText', () => {
			it('strips markdown syntax', async () => {
				const result = await markdownTool.execute(
					{ operation: 'toText', markdown: '# Hello **World**' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.text).toContain('Hello')
				expect(result.data?.text).toContain('World')
				expect(result.data?.text).not.toContain('#')
				expect(result.data?.text).not.toContain('**')
			})
		})

		describe('execution - extractHeadings', () => {
			it('extracts all headings', async () => {
				const markdown = '# Title\n## Section 1\n### Subsection\n## Section 2'
				const result = await markdownTool.execute(
					{ operation: 'extractHeadings', markdown },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.headings).toHaveLength(4)
				expect(result.data?.headings[0]).toEqual({ level: 1, text: 'Title' })
				expect(result.data?.headings[1]).toEqual({ level: 2, text: 'Section 1' })
			})
		})

		describe('execution - extractLinks', () => {
			it('extracts links', async () => {
				const markdown = '[Link 1](https://example1.com) text [Link 2](https://example2.com)'
				const result = await markdownTool.execute(
					{ operation: 'extractLinks', markdown },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.links).toHaveLength(2)
			})

			it('distinguishes links from images', async () => {
				const markdown = '[Link](https://example.com) ![Image](https://example.com/img.png)'
				const result = await markdownTool.execute(
					{ operation: 'extractLinks', markdown },
					context,
				)
				expect(result.success).toBe(true)
				const links = result.data?.links ?? []
				const regularLinks = links.filter((l: { isImage: boolean }) => !l.isImage)
				const images = links.filter((l: { isImage: boolean }) => l.isImage)
				expect(regularLinks).toHaveLength(1)
				expect(images).toHaveLength(1)
			})
		})

		describe('execution - extractCodeBlocks', () => {
			it('extracts code blocks with language', async () => {
				const markdown = '```javascript\nconst x = 1;\n```\n\n```python\nprint("hello")\n```'
				const result = await markdownTool.execute(
					{ operation: 'extractCodeBlocks', markdown },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.codeBlocks).toHaveLength(2)
				expect(result.data?.codeBlocks[0].language).toBe('javascript')
				expect(result.data?.codeBlocks[1].language).toBe('python')
			})
		})
	})

	describe('diffTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(diffTool.id).toBe('diff')
			})

			it('validates diff request', () => {
				const result = diffTool.inputSchema.safeParse({
					original: 'hello',
					modified: 'world',
				})
				expect(result.success).toBe(true)
			})

			it('validates with mode option', () => {
				const result = diffTool.inputSchema.safeParse({
					original: 'hello world',
					modified: 'hello there',
					mode: 'words',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('generates line diff', async () => {
				const result = await diffTool.execute(
					{
						original: 'line 1\nline 2\nline 3',
						modified: 'line 1\nline 2 changed\nline 3',
						mode: 'lines',
						context: 3,
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.stats).toBeDefined()
				expect(result.data?.changes).toBeDefined()
			})

			it('detects additions', async () => {
				const result = await diffTool.execute(
					{
						original: 'line 1\nline 3',
						modified: 'line 1\nline 2\nline 3',
						mode: 'lines',
						context: 3,
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.stats?.additions).toBeGreaterThan(0)
			})

			it('detects deletions', async () => {
				const result = await diffTool.execute(
					{
						original: 'line 1\nline 2\nline 3',
						modified: 'line 1\nline 3',
						mode: 'lines',
						context: 3,
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.stats?.deletions).toBeGreaterThan(0)
			})

			it('generates unified diff format', async () => {
				const result = await diffTool.execute(
					{
						original: 'line 1\nline 2',
						modified: 'line 1\nline 3',
						mode: 'lines',
						context: 3,
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.unifiedDiff).toContain('---')
				expect(result.data?.unifiedDiff).toContain('+++')
			})
		})
	})

	describe('qrcodeTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(qrcodeTool.id).toBe('qrcode')
			})

			it('validates basic QR code request', () => {
				const result = qrcodeTool.inputSchema.safeParse({
					data: 'https://example.com',
				})
				expect(result.success).toBe(true)
			})

			it('validates with type option', () => {
				const result = qrcodeTool.inputSchema.safeParse({
					data: 'https://example.com',
					type: 'url',
					size: 300,
				})
				expect(result.success).toBe(true)
			})

			it('validates wifi type with options', () => {
				const result = qrcodeTool.inputSchema.safeParse({
					data: 'wifi',
					type: 'wifi',
					wifiOptions: {
						ssid: 'MyNetwork',
						password: 'secret123',
						encryption: 'WPA',
					},
				})
				expect(result.success).toBe(true)
			})

			it('validates vcard type with options', () => {
				const result = qrcodeTool.inputSchema.safeParse({
					data: 'contact',
					type: 'vcard',
					vcardOptions: {
						firstName: 'John',
						lastName: 'Doe',
						email: 'john@example.com',
					},
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('generates QR code SVG', async () => {
				const result = await qrcodeTool.execute(
					{ data: 'test data', size: 200, type: 'text', errorCorrection: 'M' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.svg).toContain('<svg')
				expect(result.data?.svg).toContain('</svg>')
			})

			it('generates data URL', async () => {
				const result = await qrcodeTool.execute(
					{ data: 'test', size: 200, type: 'text', errorCorrection: 'M' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.dataUrl).toContain('data:image/svg+xml;base64,')
			})

			it('formats URL type correctly', async () => {
				const result = await qrcodeTool.execute(
					{ data: 'example.com', type: 'url', size: 200, errorCorrection: 'M' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.data).toBe('https://example.com')
			})

			it('formats email type correctly', async () => {
				const result = await qrcodeTool.execute(
					{ data: 'test@example.com', type: 'email', size: 200, errorCorrection: 'M' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.data).toBe('mailto:test@example.com')
			})

			it('formats phone type correctly', async () => {
				const result = await qrcodeTool.execute(
					{ data: '555-123-4567', type: 'phone', size: 200, errorCorrection: 'M' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.data).toContain('tel:')
			})
		})
	})

	describe('compressionTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(compressionTool.id).toBe('compression')
			})

			it('validates compress operation', () => {
				const result = compressionTool.inputSchema.safeParse({
					operation: 'compress',
					data: 'hello world',
				})
				expect(result.success).toBe(true)
			})

			it('validates decompress operation', () => {
				const result = compressionTool.inputSchema.safeParse({
					operation: 'decompress',
					data: 'base64encoded',
				})
				expect(result.success).toBe(true)
			})

			it('validates with algorithm option', () => {
				const result = compressionTool.inputSchema.safeParse({
					operation: 'compress',
					data: 'test',
					algorithm: 'deflate',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('compresses text data', async () => {
				const result = await compressionTool.execute(
					{ operation: 'compress', data: 'hello world '.repeat(100), algorithm: 'gzip', encoding: 'text' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.compressed).toBeDefined()
				expect(result.data?.compressedSize).toBeLessThan(result.data?.originalSize)
			})

			it('decompresses data', async () => {
				// First compress
				const compressed = await compressionTool.execute(
					{ operation: 'compress', data: 'hello world', algorithm: 'gzip', encoding: 'text' },
					context,
				)

				// Then decompress
				const decompressed = await compressionTool.execute(
					{
						operation: 'decompress',
						data: compressed.data?.compressed,
						algorithm: 'gzip',
						encoding: 'text',
					},
					context,
				)
				expect(decompressed.success).toBe(true)
				expect(decompressed.data?.decompressed).toBe('hello world')
			})

			it('calculates compression ratio', async () => {
				const result = await compressionTool.execute(
					{ operation: 'compress', data: 'aaaaaaaaaa'.repeat(100), algorithm: 'gzip', encoding: 'text' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.ratio).toBeGreaterThan(0)
			})
		})
	})

	describe('colorTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(colorTool.id).toBe('color')
			})

			it('validates convert operation', () => {
				const result = colorTool.inputSchema.safeParse({
					operation: 'convert',
					color: '#ff0000',
					format: 'rgb',
				})
				expect(result.success).toBe(true)
			})

			it('validates blend operation', () => {
				const result = colorTool.inputSchema.safeParse({
					operation: 'blend',
					color: '#ff0000',
					color2: '#0000ff',
					blendRatio: 0.5,
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution - convert', () => {
			it('converts hex to RGB', async () => {
				const result = await colorTool.execute(
					{ operation: 'convert', color: '#ff0000', format: 'rgb' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.output).toBe('rgb(255, 0, 0)')
			})

			it('converts hex to HSL', async () => {
				const result = await colorTool.execute(
					{ operation: 'convert', color: '#ff0000', format: 'hsl' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.output).toContain('hsl')
			})

			it('returns all formats', async () => {
				const result = await colorTool.execute(
					{ operation: 'convert', color: 'red', format: 'all' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.output).toHaveProperty('hex')
				expect(result.data?.output).toHaveProperty('rgb')
				expect(result.data?.output).toHaveProperty('hsl')
			})

			it('parses named colors', async () => {
				const result = await colorTool.execute(
					{ operation: 'convert', color: 'blue', format: 'hex' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.output).toBe('#0000ff')
			})

			it('handles short hex notation', async () => {
				const result = await colorTool.execute(
					{ operation: 'convert', color: '#f00', format: 'rgb' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.output).toBe('rgb(255, 0, 0)')
			})
		})

		describe('execution - lighten/darken', () => {
			it('lightens color', async () => {
				const result = await colorTool.execute(
					{ operation: 'lighten', color: '#808080', amount: 0.2 },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.output).toBeDefined()
			})

			it('darkens color', async () => {
				const result = await colorTool.execute(
					{ operation: 'darken', color: '#808080', amount: 0.2 },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.output).toBeDefined()
			})
		})

		describe('execution - complement', () => {
			it('finds complementary color', async () => {
				const result = await colorTool.execute(
					{ operation: 'complement', color: '#ff0000' },
					context,
				)
				expect(result.success).toBe(true)
				// Red's complement should be cyan-ish
				expect(result.data?.complement).toBeDefined()
			})
		})

		describe('execution - blend', () => {
			it('blends two colors', async () => {
				const result = await colorTool.execute(
					{
						operation: 'blend',
						color: '#ff0000',
						color2: '#0000ff',
						blendRatio: 0.5,
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.blended).toBeDefined()
			})
		})

		describe('execution - palette', () => {
			it('generates color palette', async () => {
				const result = await colorTool.execute(
					{ operation: 'palette', color: '#3366cc' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.palette).toHaveLength(5)
			})
		})

		describe('execution - contrast', () => {
			it('calculates contrast ratio', async () => {
				const result = await colorTool.execute(
					{ operation: 'contrast', color: '#ffffff' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.contrastWithBlack).toBeDefined()
				expect(result.data?.contrastWithWhite).toBeDefined()
				expect(result.data?.recommendedTextColor).toBeDefined()
			})

			it('determines WCAG compliance', async () => {
				const result = await colorTool.execute(
					{ operation: 'contrast', color: '#ffffff' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.wcagAA).toBeDefined()
				expect(result.data?.wcagAAA).toBeDefined()
			})
		})

		describe('error handling', () => {
			it('handles invalid color format', async () => {
				const result = await colorTool.execute(
					{ operation: 'convert', color: 'notacolor' },
					context,
				)
				expect(result.success).toBe(false)
				expect(result.error).toContain('Invalid color')
			})
		})
	})

	describe('getTransformTools', () => {
		it('returns all transform tools', () => {
			const tools = getTransformTools(context)

			expect(tools).toHaveLength(5)
			expect(tools.map((t) => t.id)).toEqual([
				'markdown',
				'diff',
				'qrcode',
				'compression',
				'color',
			])
		})
	})
})
