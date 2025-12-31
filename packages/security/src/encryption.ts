/**
 * Encryption utilities for sensitive data
 * Uses Web Crypto API for encryption/decryption
 */

import { config } from '@hare/config'

// =============================================================================
// Types
// =============================================================================

export interface EncryptDataOptions {
	/** Data to encrypt */
	data: string
	/** Secret key for encryption */
	secret: string
}

export interface DecryptDataOptions {
	/** Base64-encoded encrypted data */
	encryptedData: string
	/** Secret key for decryption */
	secret: string
}

export interface TimingSafeEqualOptions {
	/** First string to compare */
	a: string
	/** Second string to compare */
	b: string
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Generate a secure encryption key from a password or secret
 * Uses PBKDF2 for key derivation
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
	const encoder = new TextEncoder()
	const passwordKey = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		{ name: 'PBKDF2' },
		false,
		['deriveBits', 'deriveKey'],
	)

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: salt.buffer as ArrayBuffer,
			iterations: config.security.encryption.pbkdf2Iterations,
			hash: 'SHA-256',
		},
		passwordKey,
		{ name: 'AES-GCM', length: config.security.encryption.aesKeyLength },
		false,
		['encrypt', 'decrypt'],
	)
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Encrypt data using AES-GCM
 * Returns base64-encoded encrypted data with IV prepended
 */
export async function encryptData(options: EncryptDataOptions): Promise<string> {
	const { data, secret } = options
	const encoder = new TextEncoder()
	const dataBuffer = encoder.encode(data)

	// Generate random IV (12 bytes for GCM)
	const iv = crypto.getRandomValues(new Uint8Array(config.security.encryption.ivSize))

	// Generate random salt for key derivation
	const salt = crypto.getRandomValues(new Uint8Array(config.security.encryption.saltSize))

	// Derive encryption key
	const key = await deriveKey(secret, salt)

	// Encrypt data
	const encryptedData = await crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv,
		},
		key,
		dataBuffer,
	)

	// Combine salt + IV + encrypted data
	const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength)
	combined.set(salt, 0)
	combined.set(iv, salt.length)
	combined.set(new Uint8Array(encryptedData), salt.length + iv.length)

	// Return as base64
	return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt data using AES-GCM
 * Expects base64-encoded data with salt + IV + ciphertext
 */
export async function decryptData(options: DecryptDataOptions): Promise<string> {
	const { encryptedData, secret } = options
	// Decode base64
	const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))

	// Extract salt, IV, and ciphertext
	const salt = combined.slice(0, config.security.encryption.saltSize)
	const iv = combined.slice(
		config.security.encryption.saltSize,
		config.security.encryption.saltSize + config.security.encryption.ivSize,
	)
	const ciphertext = combined.slice(
		config.security.encryption.saltSize + config.security.encryption.ivSize,
	)

	// Derive decryption key
	const key = await deriveKey(secret, salt)

	// Decrypt data
	const decryptedDataBuffer = await crypto.subtle.decrypt(
		{
			name: 'AES-GCM',
			iv,
		},
		key,
		ciphertext,
	)

	// Convert to string
	const decoder = new TextDecoder()
	return decoder.decode(decryptedDataBuffer)
}

/**
 * Hash data using SHA-256
 * Returns hex-encoded hash
 */
export async function hashData(data: string): Promise<string> {
	const encoder = new TextEncoder()
	const dataBuffer = encoder.encode(data)
	const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface GenerateSecretOptions {
	/** Length of the secret in bytes (default: 32) */
	length?: number
}

/**
 * Generate a random secret key
 * Returns base64-encoded key
 */
export function generateSecret(options: GenerateSecretOptions = {}): string {
	const { length = config.security.encryption.defaultSecretLength } = options
	const array = new Uint8Array(length)
	crypto.getRandomValues(array)
	return btoa(String.fromCharCode(...array))
}

/**
 * Constant-time comparison to prevent timing attacks
 *
 * IMPORTANT: This function compares strings in constant time to prevent
 * timing-based side-channel attacks. The comparison time is proportional
 * to the length of the first string, regardless of where differences occur.
 *
 * Note: If strings have different lengths, this still leaks that information
 * (unavoidable without padding), but does NOT leak where the difference is.
 */
export function timingSafeEqual(options: TimingSafeEqualOptions): boolean {
	const { a, b } = options
	// If lengths differ, we still need to do a full comparison to avoid
	// timing attacks, but we know the result will be false
	const lengthsMatch = a.length === b.length

	// Always compare against the longer string to avoid timing differences
	// based on which string is shorter
	const compareLength = Math.max(a.length, b.length)

	let result = 0
	for (let i = 0; i < compareLength; i++) {
		// Use 0 as fallback for out-of-bounds access (constant time)
		const charA = i < a.length ? a.charCodeAt(i) : 0
		const charB = i < b.length ? b.charCodeAt(i) : 0
		result |= charA ^ charB
	}

	// Both conditions must be true: lengths match AND all characters match
	return lengthsMatch && result === 0
}
