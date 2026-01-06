import { describe, expect, it } from 'vitest'
import {
	decryptData,
	encryptData,
	generateSecret,
	hashData,
	timingSafeEqual,
} from '../encryption'

describe('Encryption Utilities', () => {
	describe('encryptData', () => {
		it('encrypts data successfully', async () => {
			const result = await encryptData({
				data: 'Hello, World!',
				secret: 'my-secret-key',
			})

			expect(result).toBeDefined()
			expect(typeof result).toBe('string')
			// Base64 encoded string should be longer than original
			expect(result.length).toBeGreaterThan('Hello, World!'.length)
		})

		it('produces different ciphertext for same input with different secrets', async () => {
			const data = 'Test data'

			const encrypted1 = await encryptData({ data, secret: 'secret-1' })
			const encrypted2 = await encryptData({ data, secret: 'secret-2' })

			expect(encrypted1).not.toBe(encrypted2)
		})

		it('produces different ciphertext for same input due to random IV/salt', async () => {
			const data = 'Test data'
			const secret = 'same-secret'

			const encrypted1 = await encryptData({ data, secret })
			const encrypted2 = await encryptData({ data, secret })

			// Due to random IV and salt, encrypting the same data twice
			// should produce different ciphertext
			expect(encrypted1).not.toBe(encrypted2)
		})

		it('encrypts empty string', async () => {
			const result = await encryptData({
				data: '',
				secret: 'my-secret',
			})

			expect(result).toBeDefined()
			expect(typeof result).toBe('string')
		})

		it('encrypts long data', async () => {
			const longData = 'x'.repeat(10000)
			const result = await encryptData({
				data: longData,
				secret: 'my-secret',
			})

			expect(result).toBeDefined()
			expect(typeof result).toBe('string')
		})

		it('handles unicode characters', async () => {
			const unicodeData = 'Hello World! Emoji: 123'
			const result = await encryptData({
				data: unicodeData,
				secret: 'my-secret',
			})

			expect(result).toBeDefined()
			expect(typeof result).toBe('string')
		})

		it('handles special characters in secret', async () => {
			const result = await encryptData({
				data: 'test data',
				secret: '!@#$%^&*()_+-=[]{}|;:,.<>?',
			})

			expect(result).toBeDefined()
			expect(typeof result).toBe('string')
		})
	})

	describe('decryptData', () => {
		it('decrypts data encrypted with encryptData', async () => {
			const originalData = 'Hello, World!'
			const secret = 'my-secret-key'

			const encrypted = await encryptData({ data: originalData, secret })
			const decrypted = await decryptData({ encryptedData: encrypted, secret })

			expect(decrypted).toBe(originalData)
		})

		it('decrypts empty string', async () => {
			const secret = 'my-secret'

			const encrypted = await encryptData({ data: '', secret })
			const decrypted = await decryptData({ encryptedData: encrypted, secret })

			expect(decrypted).toBe('')
		})

		it('decrypts long data', async () => {
			const longData = 'x'.repeat(10000)
			const secret = 'my-secret'

			const encrypted = await encryptData({ data: longData, secret })
			const decrypted = await decryptData({ encryptedData: encrypted, secret })

			expect(decrypted).toBe(longData)
		})

		it('decrypts unicode characters', async () => {
			const unicodeData = 'Hello World! Emoji: 123'
			const secret = 'my-secret'

			const encrypted = await encryptData({ data: unicodeData, secret })
			const decrypted = await decryptData({ encryptedData: encrypted, secret })

			expect(decrypted).toBe(unicodeData)
		})

		it('fails with wrong secret', async () => {
			const originalData = 'Sensitive data'
			const encrypted = await encryptData({ data: originalData, secret: 'correct-secret' })

			await expect(
				decryptData({ encryptedData: encrypted, secret: 'wrong-secret' }),
			).rejects.toThrow()
		})

		it('fails with corrupted ciphertext', async () => {
			const encrypted = await encryptData({ data: 'test', secret: 'secret' })
			// Corrupt the ciphertext by modifying a character
			const corrupted = encrypted.slice(0, -5) + 'XXXXX'

			await expect(decryptData({ encryptedData: corrupted, secret: 'secret' })).rejects.toThrow()
		})

		it('fails with invalid base64', async () => {
			await expect(
				decryptData({ encryptedData: '!!!invalid-base64!!!', secret: 'secret' }),
			).rejects.toThrow()
		})

		it('fails with truncated ciphertext', async () => {
			const encrypted = await encryptData({ data: 'test', secret: 'secret' })
			// Truncate to just a few bytes (less than salt + IV)
			const truncated = encrypted.slice(0, 10)

			await expect(
				decryptData({ encryptedData: truncated, secret: 'secret' }),
			).rejects.toThrow()
		})
	})

	describe('encryptData and decryptData round-trip', () => {
		it('handles various data types as strings', async () => {
			const testCases = [
				'simple string',
				'string with\nnewlines\nand\ttabs',
				JSON.stringify({ key: 'value', number: 123 }),
				'Unicode: Umlauts: uoa',
				'Empty after trim: ',
				'0',
				'false',
				'null',
			]

			const secret = 'test-secret-key'

			for (const data of testCases) {
				const encrypted = await encryptData({ data, secret })
				const decrypted = await decryptData({ encryptedData: encrypted, secret })
				expect(decrypted).toBe(data)
			}
		})
	})

	describe('hashData', () => {
		it('produces consistent hash for same input', async () => {
			const data = 'Hello, World!'

			const hash1 = await hashData(data)
			const hash2 = await hashData(data)

			expect(hash1).toBe(hash2)
		})

		it('produces different hashes for different input', async () => {
			const hash1 = await hashData('data1')
			const hash2 = await hashData('data2')

			expect(hash1).not.toBe(hash2)
		})

		it('produces 64 character hex string (SHA-256)', async () => {
			const hash = await hashData('test')

			expect(hash).toHaveLength(64)
			expect(hash).toMatch(/^[0-9a-f]+$/)
		})

		it('hashes empty string', async () => {
			const hash = await hashData('')

			expect(hash).toHaveLength(64)
			// Known SHA-256 hash of empty string
			expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
		})

		it('handles unicode characters', async () => {
			const hash = await hashData('Unicode test')

			expect(hash).toHaveLength(64)
			expect(hash).toMatch(/^[0-9a-f]+$/)
		})

		it('hash is case-sensitive', async () => {
			const hash1 = await hashData('Test')
			const hash2 = await hashData('test')

			expect(hash1).not.toBe(hash2)
		})
	})

	describe('generateSecret', () => {
		it('generates a base64-encoded secret', () => {
			const secret = generateSecret()

			expect(secret).toBeDefined()
			expect(typeof secret).toBe('string')
			// Base64 string should be decodable
			expect(() => atob(secret)).not.toThrow()
		})

		it('generates secrets of default length (32 bytes)', () => {
			const secret = generateSecret()
			const decoded = atob(secret)

			expect(decoded.length).toBe(32)
		})

		it('generates secrets of custom length', () => {
			const secret16 = generateSecret({ length: 16 })
			const secret64 = generateSecret({ length: 64 })

			const decoded16 = atob(secret16)
			const decoded64 = atob(secret64)

			expect(decoded16.length).toBe(16)
			expect(decoded64.length).toBe(64)
		})

		it('generates unique secrets', () => {
			const secrets = new Set<string>()
			for (let i = 0; i < 100; i++) {
				secrets.add(generateSecret())
			}

			// All 100 secrets should be unique
			expect(secrets.size).toBe(100)
		})

		it('handles length of 1', () => {
			const secret = generateSecret({ length: 1 })
			const decoded = atob(secret)

			expect(decoded.length).toBe(1)
		})

		it('handles large length', () => {
			const secret = generateSecret({ length: 256 })
			const decoded = atob(secret)

			expect(decoded.length).toBe(256)
		})
	})

	describe('timingSafeEqual', () => {
		it('returns true for equal strings', () => {
			expect(timingSafeEqual({ a: 'hello', b: 'hello' })).toBe(true)
			expect(timingSafeEqual({ a: 'password123', b: 'password123' })).toBe(true)
			expect(timingSafeEqual({ a: '', b: '' })).toBe(true)
		})

		it('returns false for different strings of same length', () => {
			expect(timingSafeEqual({ a: 'hello', b: 'world' })).toBe(false)
			expect(timingSafeEqual({ a: 'abc123', b: 'xyz789' })).toBe(false)
		})

		it('returns false for strings of different lengths', () => {
			expect(timingSafeEqual({ a: 'short', b: 'longer' })).toBe(false)
			expect(timingSafeEqual({ a: 'a', b: 'ab' })).toBe(false)
			expect(timingSafeEqual({ a: 'hello', b: '' })).toBe(false)
		})

		it('returns false when strings differ by one character', () => {
			expect(timingSafeEqual({ a: 'password', b: 'passworD' })).toBe(false)
			expect(timingSafeEqual({ a: 'test123', b: 'test124' })).toBe(false)
		})

		it('handles unicode strings', () => {
			expect(timingSafeEqual({ a: 'hello', b: 'hello' })).toBe(true)
			expect(timingSafeEqual({ a: 'hello', b: 'world' })).toBe(false)
		})

		it('handles special characters', () => {
			expect(timingSafeEqual({ a: '!@#$%^&*()', b: '!@#$%^&*()' })).toBe(true)
			expect(timingSafeEqual({ a: '!@#$%^&*()', b: '!@#$%^&*()!' })).toBe(false)
		})

		it('handles very long strings', () => {
			const longStringA = 'a'.repeat(10000)
			const longStringB = 'a'.repeat(10000)
			const longStringC = 'a'.repeat(9999) + 'b'

			expect(timingSafeEqual({ a: longStringA, b: longStringB })).toBe(true)
			expect(timingSafeEqual({ a: longStringA, b: longStringC })).toBe(false)
		})

		it('is case sensitive', () => {
			expect(timingSafeEqual({ a: 'Hello', b: 'hello' })).toBe(false)
			expect(timingSafeEqual({ a: 'TEST', b: 'test' })).toBe(false)
		})

		it('handles strings with null bytes', () => {
			expect(timingSafeEqual({ a: 'hello\0world', b: 'hello\0world' })).toBe(true)
			expect(timingSafeEqual({ a: 'hello\0world', b: 'hello\0earth' })).toBe(false)
		})
	})
})
