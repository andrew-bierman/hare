import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	// Webpack configuration for Edge runtime compatibility
	webpack: (config, { isServer }) => {
		if (isServer) {
			// Provide polyfills/fallbacks for Node.js built-in modules
			// These are needed for @mastra/core which has Node.js dependencies
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
	// Transpile packages that need it
	transpilePackages: ['@mastra/core'],
}

export default nextConfig

// Enable calling `getCloudflareContext()` in `next dev`.
// Only run in development mode, not during build.
if (process.env.NODE_ENV === 'development') {
	import('@opennextjs/cloudflare').then(({ initOpenNextCloudflareForDev }) => {
		initOpenNextCloudflareForDev()
	})
}
