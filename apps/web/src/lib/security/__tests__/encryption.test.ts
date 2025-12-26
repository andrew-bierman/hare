import { describe, expect, it } from 'vitest'
import { decryptData, encryptData, generateSecret, hashData, timingSafeEqual } from '../encryption'

describe('Encryption', () => {
	const testSecret = 'test-encryption-secret-key-12345'

	describe('encryptData and decryptData', () => {
		it('should encrypt and decrypt data successfully', async () => {
			const originalData = 'sensitive information'
			const encrypted = await encryptData(originalData, testSecret)
			const decrypted = await decryptData(encrypted, testSecret)

			expect(decrypted).toBe(originalData)
		})

		it('should produce different encrypted output each time', async () => {
			const data = 'test data'
			const encrypted1 = await encryptData(data, testSecret)
			const encrypted2 = await encryptData(data, testSecret)

			expect(encrypted1).not.toBe(encrypted2)
		})

		it('should fail to decrypt with wrong secret', async () => {
			const data = 'secret data'
			const encrypted = await encryptData(data, testSecret)

			await expect(decryptData(encrypted, 'wrong-secret')).rejects.toThrow()
		})

		it('should handle special characters', async () => {
			const data = 'Special chars: !@#$%^&*()_+-=[]{}|;:",.<>?'
			const encrypted = await encryptData(data, testSecret)
			const decrypted = await decryptData(encrypted, testSecret)

			expect(decrypted).toBe(data)
		})

		it('should handle unicode characters', async () => {
			const data = 'Unicode: 你好 こんにちは 🔒'
			const encrypted = await encryptData(data, testSecret)
			const decrypted = await decryptData(encrypted, testSecret)

			expect(decrypted).toBe(data)
		})
	})

	describe('hashData', () => {
		it('should produce consistent hash for same input', async () => {
			const data = 'test data'
			const hash1 = await hashData(data)
			const hash2 = await hashData(data)

			expect(hash1).toBe(hash2)
		})

		it('should produce different hashes for different inputs', async () => {
			const hash1 = await hashData('data1')
			const hash2 = await hashData('data2')

			expect(hash1).not.toBe(hash2)
		})

		it('should produce hex string of correct length (64 chars for SHA-256)', async () => {
			const hash = await hashData('test')

			expect(hash).toHaveLength(64)
			expect(hash).toMatch(/^[0-9a-f]{64}$/)
		})
	})

	describe('generateSecret', () => {
		it('should generate secret of default length', () => {
			const secret = generateSecret()

			expect(secret).toBeDefined()
			expect(secret.length).toBeGreaterThan(0)
		})

		it('should generate different secrets each time', () => {
			const secret1 = generateSecret()
			const secret2 = generateSecret()

			expect(secret1).not.toBe(secret2)
		})

		it('should generate secret of specified length', () => {
			const secret = generateSecret(64)

			// Base64 encoding increases size, so check it's reasonable
			expect(secret.length).toBeGreaterThan(64)
		})
	})

	describe('timingSafeEqual', () => {
		it('should return true for equal strings', () => {
			const result = timingSafeEqual('secret123', 'secret123')
			expect(result).toBe(true)
		})

		it('should return false for different strings', () => {
			const result = timingSafeEqual('secret123', 'secret456')
			expect(result).toBe(false)
		})

		it('should return false for strings of different lengths', () => {
			const result = timingSafeEqual('short', 'longer string')
			expect(result).toBe(false)
		})

		it('should be constant time (basic check)', () => {
			const iterations = 1000
			const str1 = 'a'.repeat(100)
			const str2 = 'b'.repeat(100)
			const str3 = 'a'.repeat(99) + 'b' // Different only at end

			// Time first comparison
			const start1 = performance.now()
			for (let i = 0; i < iterations; i++) {
				timingSafeEqual(str1, str2)
			}
			const time1 = performance.now() - start1

			// Time second comparison
			const start2 = performance.now()
			for (let i = 0; i < iterations; i++) {
				timingSafeEqual(str1, str3)
			}
			const time2 = performance.now() - start2

			// Times should be relatively close (within 50% of each other)
			// This is a basic check - true constant-time requires more rigorous testing
			const ratio = Math.max(time1, time2) / Math.min(time1, time2)
			expect(ratio).toBeLessThan(1.5)
		})
	})
})
