import type { NextConfig } from 'next'

// Enable calling `getCloudflareContext()` in `next dev`.
// Must be called before config export per opennextjs-cloudflare docs.
if (process.env.NODE_ENV === 'development') {
	import('@opennextjs/cloudflare').then(({ initOpenNextCloudflareForDev }) => {
		initOpenNextCloudflareForDev({
			persist: { path: '.wrangler/state/v3' },
		})
	})
}

const nextConfig: NextConfig = {
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
