import { describe, expect, it } from 'vitest'
import type { HareEnv } from '../env'

describe('HareEnv Interface', () => {
	describe('type definitions', () => {
		it('allows empty environment object', () => {
			// HareEnv allows all properties to be optional
			const env: HareEnv = {}
			expect(env).toBeDefined()
		})

		it('allows AI binding', () => {
			const mockAi = {} as Ai
			const env: HareEnv = { AI: mockAi }
			expect(env.AI).toBeDefined()
		})

		it('allows KV binding', () => {
			const mockKV = {} as KVNamespace
			const env: HareEnv = { KV: mockKV }
			expect(env.KV).toBeDefined()
		})

		it('allows R2 binding', () => {
			const mockR2 = {} as R2Bucket
			const env: HareEnv = { R2: mockR2 }
			expect(env.R2).toBeDefined()
		})

		it('allows DB binding', () => {
			const mockDB = {} as D1Database
			const env: HareEnv = { DB: mockDB }
			expect(env.DB).toBeDefined()
		})

		it('allows VECTORIZE binding', () => {
			const mockVectorize = {} as VectorizeIndex
			const env: HareEnv = { VECTORIZE: mockVectorize }
			expect(env.VECTORIZE).toBeDefined()
		})

		it('allows all bindings together', () => {
			const env: HareEnv = {
				AI: {} as Ai,
				KV: {} as KVNamespace,
				R2: {} as R2Bucket,
				DB: {} as D1Database,
				VECTORIZE: {} as VectorizeIndex,
			}
			expect(env.AI).toBeDefined()
			expect(env.KV).toBeDefined()
			expect(env.R2).toBeDefined()
			expect(env.DB).toBeDefined()
			expect(env.VECTORIZE).toBeDefined()
		})

		it('allows partial bindings', () => {
			// Only AI and KV
			const env1: HareEnv = {
				AI: {} as Ai,
				KV: {} as KVNamespace,
			}
			expect(env1.AI).toBeDefined()
			expect(env1.KV).toBeDefined()
			expect(env1.R2).toBeUndefined()

			// Only DB
			const env2: HareEnv = {
				DB: {} as D1Database,
			}
			expect(env2.DB).toBeDefined()
			expect(env2.AI).toBeUndefined()
		})
	})

	describe('extensibility', () => {
		it('allows extending HareEnv with custom bindings', () => {
			// Custom environment that extends HareEnv
			interface CustomEnv extends HareEnv {
				MY_CUSTOM_KV: KVNamespace
				API_KEY: string
			}

			const customEnv: CustomEnv = {
				AI: {} as Ai,
				KV: {} as KVNamespace,
				MY_CUSTOM_KV: {} as KVNamespace,
				API_KEY: 'secret-key',
			}

			expect(customEnv.AI).toBeDefined()
			expect(customEnv.MY_CUSTOM_KV).toBeDefined()
			expect(customEnv.API_KEY).toBe('secret-key')
		})

		it('supports worker-generated Env types', () => {
			// Simulates how Cloudflare Workers generates Env types
			interface GeneratedEnv extends HareEnv {
				AI: Ai
				KV: KVNamespace
				R2: R2Bucket
				DB: D1Database
				VECTORIZE: VectorizeIndex
				// Additional bindings from wrangler.toml
				RATE_LIMITER: RateLimit
				IMAGES_BUCKET: R2Bucket
			}

			// Type should be compatible with HareEnv
			const env: GeneratedEnv = {
				AI: {} as Ai,
				KV: {} as KVNamespace,
				R2: {} as R2Bucket,
				DB: {} as D1Database,
				VECTORIZE: {} as VectorizeIndex,
				RATE_LIMITER: {} as RateLimit,
				IMAGES_BUCKET: {} as R2Bucket,
			}

			// Can be assigned to HareEnv
			const baseEnv: HareEnv = env
			expect(baseEnv.AI).toBeDefined()
		})
	})

	describe('type checking behavior', () => {
		it('returns undefined for missing bindings', () => {
			const env: HareEnv = {}

			// All optional bindings should be undefined
			expect(env.AI).toBeUndefined()
			expect(env.KV).toBeUndefined()
			expect(env.R2).toBeUndefined()
			expect(env.DB).toBeUndefined()
			expect(env.VECTORIZE).toBeUndefined()
		})

		it('supports conditional access patterns', () => {
			const env: HareEnv = {
				KV: {} as KVNamespace,
			}

			// Pattern: Check if binding exists before use
			if (env.KV) {
				expect(env.KV).toBeDefined()
			}

			// Pattern: Optional chaining
			const hasAI = env.AI !== undefined
			expect(hasAI).toBe(false)

			const hasKV = env.KV !== undefined
			expect(hasKV).toBe(true)
		})

		it('works with nullish coalescing', () => {
			const env: HareEnv = {
				KV: {} as KVNamespace,
			}

			// AI is undefined, so fallback
			const ai = env.AI ?? 'no-ai'
			expect(ai).toBe('no-ai')

			// KV is defined
			const kv = env.KV ?? 'no-kv'
			expect(kv).not.toBe('no-kv')
		})
	})

	describe('documentation example verification', () => {
		it('matches the documented interface shape', () => {
			// This test verifies that the documented interface is accurate
			// Based on the JSDoc in env.ts
			const documentedEnv: HareEnv = {
				AI: {} as Ai,
				KV: {} as KVNamespace,
				R2: {} as R2Bucket,
				DB: {} as D1Database,
				VECTORIZE: {} as VectorizeIndex,
			}

			// All documented properties should exist
			expect(Object.keys(documentedEnv)).toEqual([
				'AI',
				'KV',
				'R2',
				'DB',
				'VECTORIZE',
			])
		})

		it('supports the SDK example pattern', () => {
			// From the JSDoc example in env.ts
			interface Env extends HareEnv {
				AI: Ai
				KV: KVNamespace
				R2: R2Bucket
				DB: D1Database
				VECTORIZE: VectorizeIndex
				// Custom bindings
				MY_CUSTOM_KV: KVNamespace
			}

			const userEnv: Env = {
				AI: {} as Ai,
				KV: {} as KVNamespace,
				R2: {} as R2Bucket,
				DB: {} as D1Database,
				VECTORIZE: {} as VectorizeIndex,
				MY_CUSTOM_KV: {} as KVNamespace,
			}

			expect(userEnv.MY_CUSTOM_KV).toBeDefined()
		})
	})
})
