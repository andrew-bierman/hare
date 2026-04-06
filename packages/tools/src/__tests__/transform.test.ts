import { beforeEach, describe, expect, it } from 'vitest'
import {
	colorTool,
	compressionTool,
	diffTool,
	getTransformTools,
	markdownTool,
	qrcodeTool,
} from '../transform'
import type { ToolContext } from '../types'
import { expectResultData, ResultSchemas } from './test-utils'

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
				const data = expectResultData({ result, schema: ResultSchemas.markdown })
				expect(data.html).toContain('<h1>Hello World</h1>')
			})

			it('converts bold text to HTML', async () => {
				const result = await markdownTool.execute(
					{ operation: 'toHtml', markdown: '**bold text**' },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.markdown })
				expect(data.html).toContain('<strong>bold text</strong>')
			})

			it('converts italic text to HTML', async () => {
				const result = await markdownTool.execute(
					{ operation: 'toHtml', markdown: '*italic text*' },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.markdown })
				expect(data.html).toContain('<em>italic text</em>')
			})

			it('converts links to HTML', async () => {
				const result = await markdownTool.execute(
					{ operation: 'toHtml', markdown: '[link](https://example.com)' },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.markdown })
				expect(data.html).toContain('<a href="https://example.com">link</a>')
			})

			it('converts code blocks to HTML', async () => {
				const result = await markdownTool.execute(
					{ operation: 'toHtml', markdown: '```javascript\nconst x = 1;\n```' },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.markdown })
				expect(data.html).toContain('<pre><code')
				expect(data.html).toContain('language-javascript')
			})

			it('handles GFM strikethrough', async () => {
				const result = await markdownTool.execute(
					{
						operation: 'toHtml',
						markdown: '~~deleted~~',
						options: { gfm: true, sanitize: false },
					},
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.markdown })
				expect(data.html).toContain('<del>deleted</del>')
			})
		})

		describe('execution - toText', () => {
			it('strips markdown syntax', async () => {
				const result = await markdownTool.execute(
					{ operation: 'toText', markdown: '# Hello **World**' },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.markdown })
				expect(data.text).toContain('Hello')
				expect(data.text).toContain('World')
				expect(data.text).not.toContain('#')
				expect(data.text).not.toContain('**')
			})
		})

		describe('execution - extractHeadings', () => {
			it('extracts all headings', async () => {
				const markdown = '# Title\n## Section 1\n### Subsection\n## Section 2'
				const result = await markdownTool.execute(
					{ operation: 'extractHeadings', markdown },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.markdown })
				expect(data.headings).toHaveLength(4)
				expect(data.headings![0]).toEqual({ level: 1, text: 'Title' })
				expect(data.headings![1]).toEqual({ level: 2, text: 'Section 1' })
			})
		})

		describe('execution - extractLinks', () => {
			it('extracts links', async () => {
				const markdown = '[Link 1](https://example1.com) text [Link 2](https://example2.com)'
				const result = await markdownTool.execute({ operation: 'extractLinks', markdown }, context)
				const data = expectResultData({ result, schema: ResultSchemas.markdown })
				expect(data.links).toHaveLength(2)
			})

			it('distinguishes links from images', async () => {
				const markdown = '[Link](https://example.com) ![Image](https://example.com/img.png)'
				const result = await markdownTool.execute({ operation: 'extractLinks', markdown }, context)
				const data = expectResultData({ result, schema: ResultSchemas.markdown })
				const links = data.links ?? []
				const regularLinks = links.filter((l: { isImage?: boolean }) => !l.isImage)
				const images = links.filter((l: { isImage?: boolean }) => l.isImage)
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
				const data = expectResultData({ result, schema: ResultSchemas.markdown })
				expect(data.codeBlocks).toHaveLength(2)
				expect(data.codeBlocks?.[0]?.language).toBe('javascript')
				expect(data.codeBlocks?.[1]?.language).toBe('python')
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
				const data = expectResultData({ result, schema: ResultSchemas.diff })
				expect(data.stats).toBeDefined()
				expect(data.changes).toBeDefined()
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
				const data = expectResultData({ result, schema: ResultSchemas.diff })
				expect(data.stats?.additions).toBeGreaterThan(0)
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
				const data = expectResultData({ result, schema: ResultSchemas.diff })
				expect(data.stats?.deletions).toBeGreaterThan(0)
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
				const data = expectResultData({ result, schema: ResultSchemas.diff })
				expect(data.unifiedDiff).toContain('---')
				expect(data.unifiedDiff).toContain('+++')
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
				const data = expectResultData({ result, schema: ResultSchemas.qrcode })
				expect(data.svg).toContain('<svg')
				expect(data.svg).toContain('</svg>')
			})

			it('generates data URL', async () => {
				const result = await qrcodeTool.execute(
					{ data: 'test', size: 200, type: 'text', errorCorrection: 'M' },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.qrcode })
				expect(data.dataUrl).toContain('data:image/svg+xml;base64,')
			})

			it('formats URL type correctly', async () => {
				const result = await qrcodeTool.execute(
					{ data: 'example.com', type: 'url', size: 200, errorCorrection: 'M' },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.qrcode })
				expect(data.data).toBe('https://example.com')
			})

			it('formats email type correctly', async () => {
				const result = await qrcodeTool.execute(
					{ data: 'test@example.com', type: 'email', size: 200, errorCorrection: 'M' },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.qrcode })
				expect(data.data).toBe('mailto:test@example.com')
			})

			it('formats phone type correctly', async () => {
				const result = await qrcodeTool.execute(
					{ data: '555-123-4567', type: 'phone', size: 200, errorCorrection: 'M' },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.qrcode })
				expect(data.data).toContain('tel:')
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
					{
						operation: 'compress',
						data: 'hello world '.repeat(100),
						algorithm: 'gzip',
						encoding: 'text',
					},
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.compression })
				expect(data.compressed).toBeDefined()
				expect(data.compressedSize).toBeLessThan(data.originalSize!)
			})

			it('decompresses data', async () => {
				// First compress
				const compressed = await compressionTool.execute(
					{ operation: 'compress', data: 'hello world', algorithm: 'gzip', encoding: 'text' },
					context,
				)
				const compressedData = expectResultData({
					result: compressed,
					schema: ResultSchemas.compression,
				})

				// Then decompress
				const decompressed = await compressionTool.execute(
					{
						operation: 'decompress',
						data: compressedData.compressed!,
						algorithm: 'gzip',
						encoding: 'text',
					},
					context,
				)
				const decompressedData = expectResultData({
					result: decompressed,
					schema: ResultSchemas.compression,
				})
				expect(decompressedData.decompressed).toBe('hello world')
			})

			it('calculates compression ratio', async () => {
				const result = await compressionTool.execute(
					{
						operation: 'compress',
						data: 'aaaaaaaaaa'.repeat(100),
						algorithm: 'gzip',
						encoding: 'text',
					},
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.compression })
				expect(data.ratio).toBeGreaterThan(0)
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
					{ operation: 'convert', color: '#ff0000', format: 'rgb', amount: 0, blendRatio: 0 },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.color })
				expect(data.output).toBe('rgb(255, 0, 0)')
			})

			it('converts hex to HSL', async () => {
				const result = await colorTool.execute(
					{ operation: 'convert', color: '#ff0000', format: 'hsl', amount: 0, blendRatio: 0 },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.color })
				expect(data.output).toContain('hsl')
			})

			it('returns all formats', async () => {
				const result = await colorTool.execute(
					{ operation: 'convert', color: 'red', format: 'all', amount: 0, blendRatio: 0 },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.color })
				expect(data.output).toHaveProperty('hex')
				expect(data.output).toHaveProperty('rgb')
				expect(data.output).toHaveProperty('hsl')
			})

			it('parses named colors', async () => {
				const result = await colorTool.execute(
					{ operation: 'convert', color: 'blue', format: 'hex', amount: 0, blendRatio: 0 },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.color })
				expect(data.output).toBe('#0000ff')
			})

			it('handles short hex notation', async () => {
				const result = await colorTool.execute(
					{ operation: 'convert', color: '#f00', format: 'rgb', amount: 0, blendRatio: 0 },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.color })
				expect(data.output).toBe('rgb(255, 0, 0)')
			})
		})

		describe('execution - lighten/darken', () => {
			it('lightens color', async () => {
				const result = await colorTool.execute(
					{ operation: 'lighten', color: '#808080', amount: 0.2, format: 'hex', blendRatio: 0 },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.color })
				expect(data.output).toBeDefined()
			})

			it('darkens color', async () => {
				const result = await colorTool.execute(
					{ operation: 'darken', color: '#808080', amount: 0.2, format: 'hex', blendRatio: 0 },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.color })
				expect(data.output).toBeDefined()
			})
		})

		describe('execution - complement', () => {
			it('finds complementary color', async () => {
				const result = await colorTool.execute(
					{ operation: 'complement', color: '#ff0000', format: 'hex', amount: 0, blendRatio: 0 },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.color })
				// Red's complement should be cyan-ish
				expect(data.complement).toBeDefined()
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
						format: 'hex',
						amount: 0,
					},
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.color })
				expect(data.blended).toBeDefined()
			})
		})

		describe('execution - palette', () => {
			it('generates color palette', async () => {
				const result = await colorTool.execute(
					{ operation: 'palette', color: '#3366cc', format: 'hex', amount: 0, blendRatio: 0 },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.color })
				expect(data.palette).toHaveLength(5)
			})
		})

		describe('execution - contrast', () => {
			it('calculates contrast ratio', async () => {
				const result = await colorTool.execute(
					{ operation: 'contrast', color: '#ffffff', format: 'hex', amount: 0, blendRatio: 0 },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.color })
				expect(data.contrastWithBlack).toBeDefined()
				expect(data.contrastWithWhite).toBeDefined()
				expect(data.recommendedTextColor).toBeDefined()
			})

			it('determines WCAG compliance', async () => {
				const result = await colorTool.execute(
					{ operation: 'contrast', color: '#ffffff', format: 'hex', amount: 0, blendRatio: 0 },
					context,
				)
				const data = expectResultData({ result, schema: ResultSchemas.color })
				expect(data.wcagAA).toBeDefined()
				expect(data.wcagAAA).toBeDefined()
			})
		})

		describe('error handling', () => {
			it('handles invalid color format', async () => {
				const result = await colorTool.execute(
					{ operation: 'convert', color: 'notacolor', format: 'hex', amount: 0, blendRatio: 0 },
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
			expect(tools.map((t) => t.id)).toEqual(['markdown', 'diff', 'qrcode', 'compression', 'color'])
		})
	})
})
