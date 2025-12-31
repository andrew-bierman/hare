// Use relative import to avoid absolute path bundling issues with Cloudflare Workers

import { loader } from 'fumadocs-core/source'
import { docs } from '../../../.source/server'

export const source = loader({
	baseUrl: '/docs',
	source: docs.toFumadocsSource(),
})
