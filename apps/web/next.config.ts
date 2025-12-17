import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	// Webpack configuration for Edge runtime compatibility
	webpack: (config, { isServer }) => {
		if (isServer) {
			// Provide polyfills/fallbacks for Node.js built-in modules
			config.resolve.fallback = {
				...config.resolve.fallback,
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

// Enable calling `getCloudflareContext()` in `next dev`.
// Only run in development mode, not during build.
if (process.env.NODE_ENV === 'development') {
	import('@opennextjs/cloudflare')
		.then(({ initOpenNextCloudflareForDev }) => {
			// Try to initialize with local persistence
			// This requires `wrangler login` for AI/Vectorize bindings
			return initOpenNextCloudflareForDev({
				persist: { path: '.wrangler/state/v3' },
			})
		})
		.catch((err) => {
			console.warn('⚠️  Cloudflare dev context failed to initialize.')
			console.warn('   Run `npx wrangler login` to enable AI and Vectorize bindings.')
			console.warn('   D1, KV, and R2 will work locally without login.')
			console.warn('   Error:', err.message)
		})
}
