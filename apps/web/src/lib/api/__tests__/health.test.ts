import { describe, it, expect } from 'vitest'
import { app } from '../index'

describe('Health API', () => {
	describe('GET /api/health', () => {
		it('returns health status', async () => {
			const res = await app.request('/api/health')
			expect(res.status).toBe(200)

			interface HealthResponse {
				status: string
				timestamp: string
				version: string
			}

			const json = (await res.json()) as HealthResponse
			expect(json.status).toBe('ok')
			expect(json.timestamp).toBeDefined()
			expect(json.version).toBeDefined()
		})

		it('returns a valid ISO timestamp', async () => {
			const res = await app.request('/api/health')

			interface HealthResponse {
				status: string
				timestamp: string
				version: string
			}

			const json = (await res.json()) as HealthResponse
			const timestamp = new Date(json.timestamp)

			expect(timestamp).toBeInstanceOf(Date)
			expect(timestamp.toISOString()).toBe(json.timestamp)
		})
	})
})
