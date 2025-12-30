// TODO: fumadocs-mdx causes CF build timeout - needs investigation
// import { docs } from 'fumadocs-mdx:collections/server'
// import { loader } from 'fumadocs-core/source'

// Temporary stub while fumadocs is disabled
export const source = {
	baseUrl: '/docs',
	getPage: () => null,
	pageTree: { name: 'docs', children: [] },
}
