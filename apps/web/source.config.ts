import path from 'node:path'
import { defineDocs, defineConfig } from 'fumadocs-mdx/config'
import {
	remarkAutoTypeTable,
	createGenerator,
	createFileSystemGeneratorCache,
} from 'fumadocs-typescript'

// Create a TypeScript generator with caching for type table generation
const generator = createGenerator({
	// Use the root tsconfig for type resolution
	tsconfigPath: path.resolve(__dirname, '../../tsconfig.json'),
	// Cache generated type documentation to speed up rebuilds
	cache: createFileSystemGeneratorCache(path.resolve(__dirname, '.cache/typedoc')),
})

// Remark plugin configuration for AutoTypeTable
const remarkAutoTypeTableConfig = {
	// Match the component name used in MDX files (<AutoTypeTable>)
	name: 'AutoTypeTable',
	// Output component name (fumadocs-ui TypeTable)
	outputName: 'TypeTable',
	generator,
	options: {
		// Resolve paths relative to the monorepo root
		basePath: path.resolve(__dirname, '../..'),
	},
}

export const docs = defineDocs({
	// Content lives in apps/web/content
	dir: './content',
	docs: {
		mdxOptions: {
			// Add remarkAutoTypeTable to transform <AutoTypeTable> components at build time
			remarkPlugins: [[remarkAutoTypeTable, remarkAutoTypeTableConfig]],
		},
	},
})

export default defineConfig({
	mdxOptions: {
		remarkPlugins: [[remarkAutoTypeTable, remarkAutoTypeTableConfig]],
	},
})
