/**
 * Mock builders for Cloudflare bindings.
 *
 * These mocks provide test doubles for Cloudflare Workers bindings
 * (D1, KV, R2, AI) that can be used in unit tests.
 *
 * Note: These mocks implement the essential functionality needed for testing.
 * They use `as unknown as Type` casts to satisfy TypeScript while providing
 * the core functionality tests actually need.
 */

import type { CloudflareEnv } from '@hare/types'

/**
 * Mock KV store that uses an in-memory Map.
 */
export interface MockKVNamespace {
	_store: Map<string, { value: string; metadata?: unknown }>
	_clear(): void
	get(key: string): Promise<string | null>
	getWithMetadata<M = unknown>(key: string): Promise<{ value: string | null; metadata: M | null }>
	put(key: string, value: string, options?: { metadata?: unknown }): Promise<void>
	delete(key: string): Promise<void>
	list(options?: {
		prefix?: string
		limit?: number
	}): Promise<{ keys: { name: string; metadata?: unknown }[]; list_complete: boolean }>
}

/**
 * Creates a mock KV namespace for testing.
 *
 * @example
 * ```ts
 * const kv = createMockKV()
 * await kv.put('key', 'value')
 * const value = await kv.get('key')
 * ```
 */
export function createMockKV(): MockKVNamespace {
	const store = new Map<string, { value: string; metadata?: unknown }>()

	return {
		_store: store,
		_clear() {
			store.clear()
		},
		async get(key: string): Promise<string | null> {
			const entry = store.get(key)
			return entry?.value ?? null
		},
		async getWithMetadata<M = unknown>(
			key: string,
		): Promise<{ value: string | null; metadata: M | null }> {
			const entry = store.get(key)
			return {
				value: entry?.value ?? null,
				metadata: (entry?.metadata as M) ?? null,
			}
		},
		async put(key: string, value: string, options?: { metadata?: unknown }): Promise<void> {
			store.set(key, { value, metadata: options?.metadata })
		},
		async delete(key: string): Promise<void> {
			store.delete(key)
		},
		async list(options?: {
			prefix?: string
			limit?: number
		}): Promise<{ keys: { name: string; metadata?: unknown }[]; list_complete: boolean }> {
			const keys: { name: string; metadata?: unknown }[] = []
			const prefix = options?.prefix ?? ''
			const limit = options?.limit ?? 1000

			for (const [key, entry] of store.entries()) {
				if (key.startsWith(prefix) && keys.length < limit) {
					keys.push({ name: key, metadata: entry.metadata })
				}
			}

			return { keys, list_complete: true }
		},
	}
}

/**
 * Mock R2 bucket that uses an in-memory Map.
 */
export interface MockR2Bucket {
	_store: Map<string, { body: ArrayBuffer; metadata?: Record<string, string> }>
	_clear(): void
	get(
		key: string,
	): Promise<{
		text(): Promise<string>
		arrayBuffer(): Promise<ArrayBuffer>
		json<T>(): Promise<T>
	} | null>
	put(key: string, value: string | ArrayBuffer): Promise<void>
	delete(key: string | string[]): Promise<void>
	list(options?: {
		prefix?: string
		limit?: number
	}): Promise<{ objects: { key: string; size: number }[] }>
	head(key: string): Promise<{ key: string; size: number } | null>
}

/**
 * Creates a mock R2 bucket for testing.
 *
 * @example
 * ```ts
 * const r2 = createMockR2()
 * await r2.put('file.txt', 'content')
 * const object = await r2.get('file.txt')
 * ```
 */
export function createMockR2(): MockR2Bucket {
	const store = new Map<string, { body: ArrayBuffer; metadata?: Record<string, string> }>()

	return {
		_store: store,
		_clear() {
			store.clear()
		},
		async get(key: string) {
			const entry = store.get(key)
			if (!entry) return null
			return {
				async text() {
					return new TextDecoder().decode(entry.body)
				},
				async arrayBuffer() {
					return entry.body
				},
				async json<T>() {
					return JSON.parse(new TextDecoder().decode(entry.body)) as T
				},
			}
		},
		async put(key: string, value: string | ArrayBuffer): Promise<void> {
			const body =
				typeof value === 'string' ? (new TextEncoder().encode(value).buffer as ArrayBuffer) : value
			store.set(key, { body })
		},
		async delete(keys: string | string[]): Promise<void> {
			const keyArray = Array.isArray(keys) ? keys : [keys]
			for (const key of keyArray) {
				store.delete(key)
			}
		},
		async list(options?: { prefix?: string; limit?: number }) {
			const objects: { key: string; size: number }[] = []
			const prefix = options?.prefix ?? ''
			const limit = options?.limit ?? 1000

			for (const [key, entry] of store.entries()) {
				if (key.startsWith(prefix) && objects.length < limit) {
					objects.push({ key, size: entry.body.byteLength })
				}
			}

			return { objects }
		},
		async head(key: string) {
			const entry = store.get(key)
			if (!entry) return null
			return { key, size: entry.body.byteLength }
		},
	}
}

/**
 * Mock D1 database result.
 */
export interface MockD1Result<T> {
	results: T[]
	success: boolean
	meta: {
		duration: number
		changes?: number
		last_row_id?: number
		rows_read?: number
		rows_written?: number
	}
}

/**
 * Mock D1 database that stores query history for assertions.
 */
export interface MockD1Database {
	_queries: { sql: string; params?: unknown[] }[]
	_mockResults: Map<string, unknown[]>
	_clear(): void
	_setMockResult(pattern: string, results: unknown[]): void
	prepare(sql: string): MockD1PreparedStatement
	batch<T>(statements: MockD1PreparedStatement[]): Promise<MockD1Result<T>[]>
	exec(query: string): Promise<{ count: number; duration: number }>
}

export interface MockD1PreparedStatement {
	bind(...values: unknown[]): MockD1PreparedStatement
	first<T>(colName?: string): Promise<T | null>
	all<T>(): Promise<MockD1Result<T>>
	raw<T>(): Promise<T[]>
	run<T>(): Promise<MockD1Result<T>>
}

/**
 * Creates a mock D1 database for testing.
 * You can pre-configure mock results for specific query patterns.
 *
 * @example
 * ```ts
 * const db = createMockD1()
 * db._setMockResult('SELECT * FROM users', [{ id: '1', name: 'Test' }])
 *
 * const stmt = db.prepare('SELECT * FROM users')
 * const results = await stmt.all()
 * ```
 */
export function createMockD1(): MockD1Database {
	const queries: { sql: string; params?: unknown[] }[] = []
	const mockResults = new Map<string, unknown[]>()

	const findMockResults = (sql: string): unknown[] => {
		for (const [pattern, results] of mockResults.entries()) {
			if (sql.includes(pattern)) {
				return results
			}
		}
		return []
	}

	const createStatement = (sql: string): MockD1PreparedStatement => {
		let boundParams: unknown[] = []

		const statement: MockD1PreparedStatement = {
			bind(...values: unknown[]): MockD1PreparedStatement {
				boundParams = values
				return statement
			},
			async first<T>(colName?: string): Promise<T | null> {
				queries.push({ sql, params: boundParams })
				const results = findMockResults(sql)
				if (results.length === 0) return null
				if (colName) {
					return (results[0] as Record<string, unknown>)[colName] as T
				}
				return results[0] as T
			},
			async all<T>(): Promise<MockD1Result<T>> {
				queries.push({ sql, params: boundParams })
				const results = findMockResults(sql)
				return {
					results: results as T[],
					success: true,
					meta: {
						duration: 0,
						changes: 0,
						last_row_id: 0,
						rows_read: results.length,
						rows_written: 0,
					},
				}
			},
			async raw<T>(): Promise<T[]> {
				queries.push({ sql, params: boundParams })
				return findMockResults(sql) as T[]
			},
			async run<T>(): Promise<MockD1Result<T>> {
				queries.push({ sql, params: boundParams })
				return {
					results: [] as T[],
					success: true,
					meta: {
						duration: 0,
						changes: 1,
						last_row_id: 1,
						rows_read: 0,
						rows_written: 1,
					},
				}
			},
		}

		return statement
	}

	return {
		_queries: queries,
		_mockResults: mockResults,
		_clear() {
			queries.length = 0
			mockResults.clear()
		},
		_setMockResult(pattern: string, results: unknown[]) {
			mockResults.set(pattern, results)
		},
		prepare(sql: string): MockD1PreparedStatement {
			return createStatement(sql)
		},
		async batch<T>(statements: MockD1PreparedStatement[]): Promise<MockD1Result<T>[]> {
			const results: MockD1Result<T>[] = []
			for (const stmt of statements) {
				results.push(await stmt.all<T>())
			}
			return results
		},
		async exec(query: string): Promise<{ count: number; duration: number }> {
			queries.push({ sql: query })
			return { count: 1, duration: 0 }
		},
	}
}

/**
 * Mock AI binding for Workers AI.
 */
export interface MockAi {
	_calls: { model: string; inputs: unknown; options?: unknown }[]
	_mockResponses: Map<string, unknown>
	_clear(): void
	_setMockResponse(model: string, response: unknown): void
	run(model: string, inputs: unknown, options?: unknown): Promise<unknown>
}

/**
 * Creates a mock AI binding for testing.
 *
 * @example
 * ```ts
 * const ai = createMockAI()
 * ai._setMockResponse('@cf/meta/llama-3', { response: 'Hello!' })
 *
 * const result = await ai.run('@cf/meta/llama-3', { prompt: 'Hi' })
 * ```
 */
export function createMockAI(): MockAi {
	const calls: { model: string; inputs: unknown; options?: unknown }[] = []
	const mockResponses = new Map<string, unknown>()

	return {
		_calls: calls,
		_mockResponses: mockResponses,
		_clear() {
			calls.length = 0
			mockResponses.clear()
		},
		_setMockResponse(model: string, response: unknown) {
			mockResponses.set(model, response)
		},
		async run(model: string, inputs: unknown, options?: unknown): Promise<unknown> {
			calls.push({ model, inputs, options })

			// Check for exact model match first
			if (mockResponses.has(model)) {
				return mockResponses.get(model)
			}

			// Check for partial match
			for (const [pattern, response] of mockResponses.entries()) {
				if (model.includes(pattern)) {
					return response
				}
			}

			// Default response for text generation
			return { response: 'Mock AI response' }
		},
	}
}

/**
 * Mock Vectorize index for vector search.
 */
export interface MockVectorizeIndex {
	_vectors: Map<string, { values: number[]; metadata?: Record<string, unknown> }>
	_clear(): void
	describe(): Promise<{ dimensions: number; vectorCount: number }>
	query(
		vector: number[],
		options?: { topK?: number },
	): Promise<{
		count: number
		matches: { id: string; score: number; values?: number[]; metadata?: Record<string, unknown> }[]
	}>
	insert(
		vectors: { id: string; values: number[]; metadata?: Record<string, unknown> }[],
	): Promise<{ mutationId: string }>
	upsert(
		vectors: { id: string; values: number[]; metadata?: Record<string, unknown> }[],
	): Promise<{ mutationId: string }>
	deleteByIds(ids: string[]): Promise<{ mutationId: string }>
	getByIds(
		ids: string[],
	): Promise<{ id: string; values: number[]; metadata?: Record<string, unknown> }[]>
}

/**
 * Creates a mock Vectorize index for testing.
 *
 * @example
 * ```ts
 * const vectorize = createMockVectorize()
 * await vectorize.upsert([{ id: '1', values: [0.1, 0.2, 0.3] }])
 * const results = await vectorize.query([0.1, 0.2, 0.3], { topK: 5 })
 * ```
 */
export function createMockVectorize(): MockVectorizeIndex {
	const vectors = new Map<string, { values: number[]; metadata?: Record<string, unknown> }>()

	const mock: MockVectorizeIndex = {
		_vectors: vectors,
		_clear() {
			vectors.clear()
		},
		async describe() {
			return {
				dimensions: 768,
				vectorCount: vectors.size,
			}
		},
		async query(vector: number[], options?: { topK?: number }) {
			const topK = options?.topK ?? 10
			const matches: {
				id: string
				score: number
				values?: number[]
				metadata?: Record<string, unknown>
			}[] = []

			// Simple mock - return all vectors with random scores
			for (const [id, entry] of vectors.entries()) {
				matches.push({
					id,
					score: Math.random(),
					values: entry.values,
					metadata: entry.metadata,
				})
			}

			// Sort by score and limit
			matches.sort((a, b) => b.score - a.score)
			return {
				count: Math.min(topK, matches.length),
				matches: matches.slice(0, topK),
			}
		},
		async insert(vecs) {
			for (const vec of vecs) {
				vectors.set(vec.id, {
					values: vec.values,
					metadata: vec.metadata,
				})
			}
			return { mutationId: 'mock-mutation' }
		},
		async upsert(vecs) {
			return mock.insert(vecs)
		},
		async deleteByIds(ids: string[]) {
			for (const id of ids) {
				vectors.delete(id)
			}
			return { mutationId: 'mock-mutation' }
		},
		async getByIds(ids: string[]) {
			const results: { id: string; values: number[]; metadata?: Record<string, unknown> }[] = []
			for (const id of ids) {
				const entry = vectors.get(id)
				if (entry) {
					results.push({
						id,
						values: entry.values,
						metadata: entry.metadata,
					})
				}
			}
			return results
		},
	}

	return mock
}

/**
 * Options for creating a mock Cloudflare environment.
 */
export interface CreateMockEnvOptions {
	kvData?: Record<string, string>
	r2Data?: Record<string, string | ArrayBuffer>
	d1Results?: Record<string, unknown[]>
	aiResponses?: Record<string, unknown>
	vectors?: Array<{ id: string; values: number[]; metadata?: Record<string, unknown> }>
	env?: Partial<CloudflareEnv>
}

/**
 * Creates a complete mock Cloudflare environment for testing.
 *
 * @example
 * ```ts
 * const env = createMockEnv({
 *   kvData: { 'user:1': JSON.stringify({ name: 'Test' }) },
 *   aiResponses: { 'llama': { response: 'Hello' } }
 * })
 *
 * // Use in tests
 * const value = await env.KV.get('user:1')
 * ```
 */
export function createMockEnv(options: CreateMockEnvOptions = {}): CloudflareEnv {
	const kv = createMockKV()
	const r2 = createMockR2()
	const db = createMockD1()
	const ai = createMockAI()
	const vectorize = createMockVectorize()

	// Pre-populate KV
	if (options.kvData) {
		for (const [key, value] of Object.entries(options.kvData)) {
			kv._store.set(key, { value })
		}
	}

	// Pre-populate R2
	if (options.r2Data) {
		for (const [key, value] of Object.entries(options.r2Data)) {
			const body =
				typeof value === 'string' ? (new TextEncoder().encode(value).buffer as ArrayBuffer) : value
			r2._store.set(key, { body })
		}
	}

	// Pre-configure D1 mock results
	if (options.d1Results) {
		for (const [pattern, results] of Object.entries(options.d1Results)) {
			db._setMockResult(pattern, results)
		}
	}

	// Pre-configure AI mock responses
	if (options.aiResponses) {
		for (const [model, response] of Object.entries(options.aiResponses)) {
			ai._setMockResponse(model, response)
		}
	}

	// Pre-populate vectors
	if (options.vectors) {
		for (const vec of options.vectors) {
			vectorize._vectors.set(vec.id, {
				values: vec.values,
				metadata: vec.metadata,
			})
		}
	}

	return {
		KV: kv as unknown as KVNamespace,
		R2: r2 as unknown as R2Bucket,
		DB: db as unknown as D1Database,
		AI: ai as unknown as Ai,
		VECTORIZE: vectorize as unknown as VectorizeIndex,
		ASSETS: {} as Fetcher,
		WORKER_SELF_REFERENCE: {} as Fetcher,
		HARE_AGENT: {} as DurableObjectNamespace,
		MCP_AGENT: {} as DurableObjectNamespace,
		RATE_LIMITER: {} as unknown as CloudflareEnv['RATE_LIMITER'],
		RATE_LIMITER_STRICT: {} as unknown as CloudflareEnv['RATE_LIMITER_STRICT'],
		RATE_LIMITER_CHAT: {} as unknown as CloudflareEnv['RATE_LIMITER_CHAT'],
		ENVIRONMENT: 'test',
		NODE_ENV: 'test',
		APP_URL: 'http://localhost:3000',
		BETTER_AUTH_SECRET: 'test-secret',
		BETTER_AUTH_URL: 'http://localhost:3000',
		STRIPE_SECRET_KEY: 'sk_test_mock',
		STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',
		...options.env,
	} as CloudflareEnv
}
