// Standard fumadocs Vite flow
// https://www.fumadocs.dev/docs/mdx/vite
import { docs } from 'fumadocs-mdx:collections/server'
import { loader } from 'fumadocs-core/source'

export const source = loader({
	baseUrl: '/docs',
	source: docs.toFumadocsSource(),
})
