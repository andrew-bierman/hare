/**
 * @hare/docs - Documentation generation and content for Hare
 *
 * This package provides:
 * - TypeScript AST-based documentation generator
 * - Auto-generated MDX content for SDK packages
 * - Reusable types for documentation structures
 */

export {
	type DocClass,
	type DocFunction,
	type DocInterface,
	type DocMethod,
	// Types
	type DocProperty,
	type DocTool,
	type ExtractedDocs,
	extractDocsFromFile,
	type GeneratorOptions,
	generateClassMDX,
	// Functions
	generateDocs,
	generateFunctionMDX,
	generateInterfaceMDX,
	generatePackageMDX,
	generateToolMDX,
	type PackageConfig,
} from './generator'
