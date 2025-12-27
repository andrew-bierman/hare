import { describe, expect, it } from 'vitest'
import { decryptData, encryptData, generateSecret, hashData, timingSafeEqual } from '../encryption'

describe('encryptData and decryptData', () => {
	const testSecret = 'test-encryption-key-32-chars-ok!'

	it('should encrypt and decrypt data correctly', async () => {
		const originalData = 'Hello, World!'
		const encrypted = await encryptData(originalData, testSecret)
		const decrypted = await decryptData(encrypted, testSecret)

		expect(decrypted).toBe(originalData)
	})

	it('should produce different ciphertext for same plaintext', async () => {
		const data = 'Same data'
		const encrypted1 = await encryptData(data, testSecret)
		const encrypted2 = await encryptData(data, testSecret)

		expect(encrypted1).not.toBe(encrypted2)
	})

	it('should handle empty strings', async () => {
		const encrypted = await encryptData('', testSecret)
		const decrypted = await decryptData(encrypted, testSecret)

		expect(decrypted).toBe('')
	})

	it('should handle unicode characters', async () => {
		const unicodeData = '日本語 中文 한국어 🎉🔐'
		const encrypted = await encryptData(unicodeData, testSecret)
		const decrypted = await decryptData(encrypted, testSecret)

		expect(decrypted).toBe(unicodeData)
	})

	it('should handle long strings', async () => {
		const longData = 'a'.repeat(10000)
		const encrypted = await encryptData(longData, testSecret)
		const decrypted = await decryptData(encrypted, testSecret)

		expect(decrypted).toBe(longData)
	})

	it('should fail with wrong secret', async () => {
		const data = 'Secret data'
		const encrypted = await encryptData(data, testSecret)

		await expect(decryptData(encrypted, 'wrong-secret')).rejects.toThrow()
	})

	it('should fail with tampered ciphertext', async () => {
		const data = 'Secret data'
		const encrypted = await encryptData(data, testSecret)

		// Tamper with the ciphertext
		const tampered = `${encrypted.slice(0, -5)}XXXXX`

		await expect(decryptData(tampered, testSecret)).rejects.toThrow()
	})
})

describe('hashData', () => {
	it('should produce consistent hashes', async () => {
		const data = 'test data'
		const hash1 = await hashData(data)
		const hash2 = await hashData(data)

		expect(hash1).toBe(hash2)
	})

	it('should produce different hashes for different data', async () => {
		const hash1 = await hashData('data1')
		const hash2 = await hashData('data2')

		expect(hash1).not.toBe(hash2)
	})

	it('should produce 64-character hex string (SHA-256)', async () => {
		const hash = await hashData('test')
		expect(hash).toHaveLength(64)
		expect(/^[a-f0-9]+$/.test(hash)).toBe(true)
	})

	it('should handle empty strings', async () => {
		const hash = await hashData('')
		expect(hash).toHaveLength(64)
	})

	it('should handle unicode', async () => {
		const hash = await hashData('日本語')
		expect(hash).toHaveLength(64)
	})
})

describe('generateSecret', () => {
	it('should generate secret of default length', () => {
		const secret = generateSecret()
		// Base64 encoding of 32 bytes = 44 characters
		expect(secret.length).toBeGreaterThan(0)
	})

	it('should generate unique secrets', () => {
		const secrets = new Set<string>()
		for (let i = 0; i < 100; i++) {
			secrets.add(generateSecret())
		}
		expect(secrets.size).toBe(100)
	})

	it('should respect length parameter', () => {
		const short = generateSecret(16)
		const long = generateSecret(64)

		// Longer input = longer base64 output
		expect(long.length).toBeGreaterThan(short.length)
	})
})

describe('timingSafeEqual', () => {
	it('should return true for equal strings', () => {
		expect(timingSafeEqual('hello', 'hello')).toBe(true)
		expect(timingSafeEqual('', '')).toBe(true)
		expect(timingSafeEqual('abc123', 'abc123')).toBe(true)
	})

	it('should return false for different strings', () => {
		expect(timingSafeEqual('hello', 'world')).toBe(false)
		expect(timingSafeEqual('abc', 'abd')).toBe(false)
	})

	it('should return false for different length strings', () => {
		expect(timingSafeEqual('short', 'longer')).toBe(false)
		expect(timingSafeEqual('longer', 'short')).toBe(false)
	})

	it('should handle empty vs non-empty', () => {
		expect(timingSafeEqual('', 'something')).toBe(false)
		expect(timingSafeEqual('something', '')).toBe(false)
	})

	it('should handle unicode', () => {
		expect(timingSafeEqual('日本語', '日本語')).toBe(true)
		expect(timingSafeEqual('日本語', '中文')).toBe(false)
	})

	it('should detect single character differences', () => {
		expect(timingSafeEqual('password1', 'password2')).toBe(false)
		expect(timingSafeEqual('Aassword', 'Bassword')).toBe(false)
	})
})
