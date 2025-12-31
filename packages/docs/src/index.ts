/**
 * @hare/docs - Documentation generation and content for Hare
 *
 * This package provides:
 * - TypeScript AST-based documentation generator
 * - Auto-generated MDX content for SDK packages
 * - Reusable types for documentation structures
 */

export {
	// Types
	type DocProperty,
	type DocMethod,
	type DocInterface,
	type DocClass,
	type DocFunction,
	type DocTool,
	type ExtractedDocs,
	type PackageConfig,
	type GeneratorOptions,
	// Functions
	generateDocs,
	extractDocsFromFile,
	generatePackageMDX,
	generateClassMDX,
	generateInterfaceMDX,
	generateFunctionMDX,
	generateToolMDX,
} from './generator'
