import { defineConfig } from 'drizzle-kit'

// D1 database credentials from environment
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID
const token = process.env.CLOUDFLARE_D1_TOKEN

export default defineConfig({
	schema: '../../packages/db/src/schema/index.ts',
	out: './migrations',
	dialect: 'sqlite',
	// D1 HTTP driver for remote operations (studio, push, introspect)
	// Only enabled when all D1 credentials are set
	...(token &&
		accountId &&
		databaseId && {
			driver: 'd1-http',
			dbCredentials: {
				accountId,
				databaseId,
				token,
			},
		}),
})
