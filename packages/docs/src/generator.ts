/**
 * Documentation generator using TypeScript AST.
 *
 * Extracts JSDoc comments, interfaces, classes, functions, and tool definitions
 * from TypeScript source files and generates MDX documentation.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as ts from 'typescript'

// ============================================================================
// Types
// ============================================================================

export interface DocProperty {
	name: string
	type: string
	description: string
	optional: boolean
}

export interface DocMethod {
	name: string
	description: string
	params: { name: string; type: string; description: string }[]
	returnType: string
	example?: string
}

export interface DocInterface {
	name: string
	description: string
	properties: DocProperty[]
	example?: string
}

export interface DocClass {
	name: string
	description: string
	properties: DocProperty[]
	methods: DocMethod[]
	example?: string
}

export interface DocFunction {
	name: string
	description: string
	params: { name: string; type: string; description: string }[]
	returnType: string
	example?: string
}

export interface DocTool {
	id: string
	description: string
	inputSchema: DocProperty[]
	outputSchema?: DocProperty[]
}

export interface ExtractedDocs {
	interfaces: DocInterface[]
	classes: DocClass[]
	functions: DocFunction[]
	tools: DocTool[]
}

export interface PackageConfig {
	name: string
	path: string
	outputFile: string
	title: string
	description: string
}

export interface GeneratorOptions {
	packages: PackageConfig[]
	baseDir: string
	verbose?: boolean
}

// ============================================================================
// TypeScript AST Helpers
// ============================================================================

function getJSDocComment(node: ts.Node): string {
	const jsDocComments = (node as unknown as { jsDoc?: ts.JSDoc[] }).jsDoc

	if (jsDocComments && jsDocComments.length > 0) {
		const jsDoc = jsDocComments[0]
		if (jsDoc) {
			const comment = jsDoc.comment
			if (typeof comment === 'string') {
				return comment
			}
			if (Array.isArray(comment)) {
				return comment
					.map((c: string | { text: string }) => (typeof c === 'string' ? c : c.text))
					.join('')
			}
		}
	}

	return ''
}

function getJSDocExample(node: ts.Node): string | undefined {
	const jsDocComments = (node as unknown as { jsDoc?: ts.JSDoc[] }).jsDoc
	if (!jsDocComments) return undefined

	for (const jsDoc of jsDocComments) {
		if (!jsDoc.tags) continue
		for (const tag of jsDoc.tags) {
			if (tag.tagName?.text === 'example') {
				const comment = tag.comment
				if (typeof comment === 'string') {
					return comment.trim()
				}
				if (Array.isArray(comment)) {
					return comment
						.map((c: string | { text: string }) => (typeof c === 'string' ? c : c.text))
						.join('')
						.trim()
				}
			}
		}
	}

	return undefined
}

// ============================================================================
// Extractors
// ============================================================================

function extractInterface(
	node: ts.InterfaceDeclaration,
	sourceFile: ts.SourceFile,
): DocInterface | null {
	const name = node.name.text
	const description = getJSDocComment(node)
	const example = getJSDocExample(node)

	const properties: DocProperty[] = []

	for (const member of node.members) {
		if (ts.isPropertySignature(member) && member.name) {
			const propName = member.name.getText(sourceFile)
			const propType = member.type ? member.type.getText(sourceFile) : 'unknown'
			const propDescription = getJSDocComment(member)
			const optional = !!member.questionToken

			properties.push({
				name: propName,
				type: propType,
				description: propDescription,
				optional,
			})
		}
	}

	return { name, description, properties, example }
}

function extractClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): DocClass | null {
	if (!node.name) return null

	const name = node.name.text
	const description = getJSDocComment(node)
	const example = getJSDocExample(node)

	const properties: DocProperty[] = []
	const methods: DocMethod[] = []

	for (const member of node.members) {
		if (ts.isPropertyDeclaration(member) && member.name) {
			const propName = member.name.getText(sourceFile)
			const propType = member.type ? member.type.getText(sourceFile) : 'unknown'
			const propDescription = getJSDocComment(member)

			properties.push({
				name: propName,
				type: propType,
				description: propDescription,
				optional: !!member.questionToken,
			})
		}

		if (ts.isMethodDeclaration(member) && member.name) {
			const methodName = member.name.getText(sourceFile)
			const methodDescription = getJSDocComment(member)
			const methodExample = getJSDocExample(member)

			const params: { name: string; type: string; description: string }[] = []
			for (const param of member.parameters) {
				const paramName = param.name.getText(sourceFile)
				const paramType = param.type ? param.type.getText(sourceFile) : 'unknown'
				params.push({ name: paramName, type: paramType, description: '' })
			}

			const returnType = member.type ? member.type.getText(sourceFile) : 'void'

			// Skip private methods
			if (
				member.modifiers?.some(
					(m) =>
						m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword,
				)
			) {
				continue
			}

			methods.push({
				name: methodName,
				description: methodDescription,
				params,
				returnType,
				example: methodExample,
			})
		}
	}

	return { name, description, properties, methods, example }
}

function extractFunction(
	node: ts.FunctionDeclaration,
	sourceFile: ts.SourceFile,
): DocFunction | null {
	if (!node.name) return null

	const name = node.name.text
	const description = getJSDocComment(node)
	const example = getJSDocExample(node)

	const params: { name: string; type: string; description: string }[] = []
	for (const param of node.parameters) {
		const paramName = param.name.getText(sourceFile)
		const paramType = param.type ? param.type.getText(sourceFile) : 'unknown'
		params.push({ name: paramName, type: paramType, description: '' })
	}

	const returnType = node.type ? node.type.getText(sourceFile) : 'void'

	return { name, description, params, returnType, example }
}

function extractToolFromVariable(
	node: ts.VariableStatement,
	sourceFile: ts.SourceFile,
): DocTool | null {
	for (const decl of node.declarationList.declarations) {
		if (!ts.isIdentifier(decl.name)) continue
		if (!decl.initializer || !ts.isCallExpression(decl.initializer)) continue

		const callExpr = decl.initializer
		const exprText = callExpr.expression.getText(sourceFile)

		if (exprText !== 'createTool') continue

		const arg = callExpr.arguments[0]
		if (!arg || !ts.isObjectLiteralExpression(arg)) continue

		let id = ''
		let description = ''
		const inputSchema: DocProperty[] = []

		for (const prop of arg.properties) {
			if (!ts.isPropertyAssignment(prop)) continue
			const propName = prop.name.getText(sourceFile)

			if (propName === 'id' && ts.isStringLiteral(prop.initializer)) {
				id = prop.initializer.text
			}

			if (propName === 'description' && ts.isStringLiteral(prop.initializer)) {
				description = prop.initializer.text
			}

			// Parse inputSchema (z.object(...))
			if (propName === 'inputSchema' && ts.isCallExpression(prop.initializer)) {
				const zodCall = prop.initializer
				if (zodCall.arguments[0] && ts.isObjectLiteralExpression(zodCall.arguments[0])) {
					for (const schemaProp of zodCall.arguments[0].properties) {
						if (!ts.isPropertyAssignment(schemaProp)) continue
						const schemaName = schemaProp.name.getText(sourceFile)

						const initText = schemaProp.initializer.getText(sourceFile)

						// Extract type from z.string(), z.number(), etc.
						let schemaType = 'unknown'
						const typeMatch = initText.match(/z\.(string|number|boolean|array|object|enum|record)/)
						if (typeMatch?.[1]) {
							schemaType = typeMatch[1]
						}

						// Extract description from .describe('...')
						let schemaDesc = ''
						const descMatch = initText.match(/\.describe\(['"]([^'"]+)['"]\)/)
						if (descMatch?.[1]) {
							schemaDesc = descMatch[1]
						}

						// Check if optional
						const optional = initText.includes('.optional()')

						inputSchema.push({
							name: schemaName,
							type: schemaType,
							description: schemaDesc,
							optional,
						})
					}
				}
			}
		}

		if (id) {
			return { id, description, inputSchema }
		}
	}

	return null
}

// ============================================================================
// File Processing
// ============================================================================

export function extractDocsFromFile(filePath: string): ExtractedDocs {
	const program = ts.createProgram([filePath], {
		target: ts.ScriptTarget.ESNext,
		module: ts.ModuleKind.ESNext,
	})

	const sourceFile = program.getSourceFile(filePath)

	const docs: ExtractedDocs = {
		interfaces: [],
		classes: [],
		functions: [],
		tools: [],
	}

	if (!sourceFile) return docs

	function visit(node: ts.Node) {
		if (ts.isInterfaceDeclaration(node)) {
			if (
				node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ||
				node.name.text.startsWith('Hare') ||
				node.name.text.startsWith('Agent')
			) {
				const iface = extractInterface(node, sourceFile!)
				if (iface) docs.interfaces.push(iface)
			}
		}

		if (ts.isClassDeclaration(node)) {
			if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
				const cls = extractClass(node, sourceFile!)
				if (cls) docs.classes.push(cls)
			}
		}

		if (ts.isFunctionDeclaration(node)) {
			if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
				const fn = extractFunction(node, sourceFile!)
				if (fn) docs.functions.push(fn)
			}
		}

		if (ts.isVariableStatement(node)) {
			if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
				const tool = extractToolFromVariable(node, sourceFile!)
				if (tool) docs.tools.push(tool)
			}
		}

		ts.forEachChild(node, visit)
	}

	visit(sourceFile)
	return docs
}

// ============================================================================
// MDX Generation
// ============================================================================

export function generateInterfaceMDX(iface: DocInterface): string {
	let mdx = `### ${iface.name}\n\n`

	if (iface.description) {
		mdx += `${iface.description}\n\n`
	}

	if (iface.properties.length > 0) {
		mdx += `| Property | Type | Description |\n`
		mdx += `|----------|------|-------------|\n`
		for (const prop of iface.properties) {
			const optional = prop.optional ? ' (optional)' : ''
			const type = prop.type.replace(/\|/g, '\\|')
			mdx += `| \`${prop.name}\`${optional} | \`${type}\` | ${prop.description || '-'} |\n`
		}
		mdx += '\n'
	}

	if (iface.example) {
		mdx += `**Example:**\n\n\`\`\`ts\n${iface.example}\n\`\`\`\n\n`
	}

	return mdx
}

export function generateClassMDX(cls: DocClass): string {
	let mdx = `## ${cls.name}\n\n`

	if (cls.description) {
		mdx += `${cls.description}\n\n`
	}

	if (cls.example) {
		mdx += `### Example\n\n\`\`\`ts\n${cls.example}\n\`\`\`\n\n`
	}

	if (cls.properties.length > 0) {
		mdx += `### Properties\n\n`
		mdx += `| Property | Type | Description |\n`
		mdx += `|----------|------|-------------|\n`
		for (const prop of cls.properties) {
			const type = prop.type.replace(/\|/g, '\\|')
			mdx += `| \`${prop.name}\` | \`${type}\` | ${prop.description || '-'} |\n`
		}
		mdx += '\n'
	}

	if (cls.methods.length > 0) {
		mdx += `### Methods\n\n`
		for (const method of cls.methods) {
			const params = method.params.map((p) => `${p.name}: ${p.type}`).join(', ')
			mdx += `#### \`${method.name}(${params}): ${method.returnType}\`\n\n`
			if (method.description) {
				mdx += `${method.description}\n\n`
			}
		}
	}

	return mdx
}

export function generateToolMDX(tool: DocTool): string {
	let mdx = `### ${tool.id}\n\n`

	if (tool.description) {
		mdx += `${tool.description}\n\n`
	}

	if (tool.inputSchema.length > 0) {
		mdx += `**Parameters:**\n\n`
		mdx += `| Parameter | Type | Description |\n`
		mdx += `|-----------|------|-------------|\n`
		for (const prop of tool.inputSchema) {
			const optional = prop.optional ? ' (optional)' : ''
			mdx += `| \`${prop.name}\`${optional} | \`${prop.type}\` | ${prop.description || '-'} |\n`
		}
		mdx += '\n'
	}

	return mdx
}

export function generateFunctionMDX(fn: DocFunction): string {
	const params = fn.params.map((p) => `${p.name}: ${p.type}`).join(', ')
	let mdx = `### \`${fn.name}(${params}): ${fn.returnType}\`\n\n`

	if (fn.description) {
		mdx += `${fn.description}\n\n`
	}

	if (fn.example) {
		mdx += `**Example:**\n\n\`\`\`ts\n${fn.example}\n\`\`\`\n\n`
	}

	return mdx
}

export function generatePackageMDX(options: {
	title?: string
	description?: string
	docs: ExtractedDocs
}): string {
	const { title = 'API Reference', description = '', docs } = options

	let mdx = `---
title: ${title}
description: ${description}
---

# ${title}

> This documentation is auto-generated from TypeScript source files.

`

	if (docs.classes.length > 0) {
		mdx += `## Classes\n\n`
		for (const cls of docs.classes) {
			mdx += generateClassMDX(cls)
		}
	}

	if (docs.interfaces.length > 0) {
		mdx += `## Types\n\n`
		for (const iface of docs.interfaces) {
			mdx += generateInterfaceMDX(iface)
		}
	}

	if (docs.functions.length > 0) {
		mdx += `## Functions\n\n`
		for (const fn of docs.functions) {
			mdx += generateFunctionMDX(fn)
		}
	}

	if (docs.tools.length > 0) {
		mdx += `## Tools\n\n`
		for (const tool of docs.tools) {
			mdx += generateToolMDX(tool)
		}
	}

	return mdx
}

// ============================================================================
// Main Generator
// ============================================================================

export async function generateDocs(options: GeneratorOptions): Promise<void> {
	const { packages, baseDir, verbose } = options

	for (const pkg of packages) {
		if (verbose) console.log(`\nProcessing ${pkg.name}...`)

		const pkgPath = path.resolve(baseDir, pkg.path)

		if (!fs.existsSync(pkgPath)) {
			console.warn(`  Warning: Path not found: ${pkgPath}`)
			continue
		}

		const files = fs
			.readdirSync(pkgPath)
			.filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.startsWith('__'))

		const allDocs: ExtractedDocs = {
			interfaces: [],
			classes: [],
			functions: [],
			tools: [],
		}

		for (const file of files) {
			const filePath = path.join(pkgPath, file)
			if (verbose) console.log(`  Extracting from ${file}...`)

			const docs = extractDocsFromFile(filePath)
			allDocs.interfaces.push(...docs.interfaces)
			allDocs.classes.push(...docs.classes)
			allDocs.functions.push(...docs.functions)
			allDocs.tools.push(...docs.tools)
		}

		// Generate MDX
		const mdx = generatePackageMDX({
			title: pkg.title,
			description: pkg.description,
			docs: allDocs,
		})

		// Write output
		const outputPath = path.resolve(baseDir, pkg.outputFile)
		const outputDir = path.dirname(outputPath)

		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true })
		}

		fs.writeFileSync(outputPath, mdx)

		if (verbose) {
			console.log(`  Generated ${pkg.outputFile}`)
			console.log(`    - ${allDocs.classes.length} classes`)
			console.log(`    - ${allDocs.interfaces.length} interfaces`)
			console.log(`    - ${allDocs.functions.length} functions`)
			console.log(`    - ${allDocs.tools.length} tools`)
		}
	}

	if (verbose) console.log('\nDone!')
}
