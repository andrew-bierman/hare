// Type declarations for fumadocs-mdx virtual modules
// These modules are generated at build time by the fumadocs-mdx Vite plugin
// The actual types are complex and dynamically generated, so we use permissive types here

declare module 'fumadocs-mdx:collections/server' {
	import type { Source, SourceConfig } from 'fumadocs-core/source'

	// The docs collection provides toFumadocsSource() which returns a Source
	export const docs: {
		toFumadocsSource: () => Source<SourceConfig>
	}
}

declare module 'fumadocs-mdx:collections/browser' {
	// biome-ignore lint/suspicious/noExplicitAny: Virtual module types are dynamically generated
	export const docs: any
}

declare module 'fumadocs-mdx:collections/dynamic' {
	// biome-ignore lint/suspicious/noExplicitAny: Virtual module types are dynamically generated
	export const docs: any
}
