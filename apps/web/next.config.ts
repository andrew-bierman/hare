import type { NextConfig } from 'next'

// Enable calling `getCloudflareContext()` in `next dev`.
// Must be called before config export per opennextjs-cloudflare docs.
if (process.env.NODE_ENV === 'development' && process.env.SKIP_CF_DEV !== 'true') {
	// Use local-only bindings in CI (no Cloudflare credentials required)
	const isCI = process.env.CI === 'true'
	const configPath = isCI ? './wrangler.e2e.jsonc' : './wrangler.jsonc'

	import('@opennextjs/cloudflare')
		.then(({ initOpenNextCloudflareForDev }) => {
			initOpenNextCloudflareForDev({
				configPath,
				persist: { path: '.wrangler/state/v3' },
				// Disable remote bindings in CI to use local Miniflare emulation
				remoteBindings: !isCI,
			})
		})
		.catch((err) => {
			console.warn('Cloudflare dev mode not available:', err.message)
		})
}

const nextConfig: NextConfig = {
	// Required for OpenNext/Cloudflare deployment
	output: 'standalone',
	// Webpack configuration for Edge runtime compatibility
	webpack: (
		config: Record<string, unknown> & { resolve: { fallback?: Record<string, boolean> } },
		{ isServer }: { isServer: boolean },
	) => {
		if (isServer) {
			// Provide polyfills/fallbacks for Node.js built-in modules
			config.resolve.fallback = {
				...(config.resolve.fallback || {}),
				path: false,
				os: false,
				fs: false,
				module: false,
				crypto: false,
				stream: false,
				buffer: false,
				util: false,
				events: false,
				assert: false,
				http: false,
				https: false,
				url: false,
				zlib: false,
				net: false,
				tls: false,
				child_process: false,
			}
		}
		return config
	},
}

export default nextConfig
