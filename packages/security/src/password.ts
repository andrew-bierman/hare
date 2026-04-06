/**
 * Password security utilities
 * Implements strong password policies and validation
 */

export interface PasswordValidationResult {
	valid: boolean
	errors: string[]
	strength: 'weak' | 'fair' | 'good' | 'strong'
	score: number
}

/**
 * Common passwords that should be rejected
 * This is a small subset - in production, use a comprehensive list
 */
const COMMON_PASSWORDS = new Set([
	'password',
	'password123',
	'12345678',
	'qwerty',
	'abc123',
	'monkey',
	'1234567890',
	'letmein',
	'trustno1',
	'dragon',
	'baseball',
	'iloveyou',
	'master',
	'sunshine',
	'ashley',
	'bailey',
	'passw0rd',
	'shadow',
	'123123',
	'654321',
	'superman',
	'qazwsx',
	'michael',
	'football',
])

export interface PasswordValidationOptions {
	minLength?: number
	requireUppercase?: boolean
	requireLowercase?: boolean
	requireNumber?: boolean
	requireSpecial?: boolean
	checkCommon?: boolean
	checkSequential?: boolean
}

/**
 * Validate password strength and compliance with security policies
 *
 * Requirements:
 * - Minimum 8 characters (configurable, recommended 12+)
 * - Maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not a common password
 * - No sequential characters (123, abc, etc.)
 */
export function validatePassword(
	password: string,
	options: PasswordValidationOptions = {},
): PasswordValidationResult {
	const {
		minLength = 8,
		requireUppercase = true,
		requireLowercase = true,
		requireNumber = true,
		requireSpecial = true,
		checkCommon = true,
		checkSequential = true,
	} = options

	const errors: string[] = []
	let score = 0

	// Length checks
	if (password.length < minLength) {
		errors.push(`Password must be at least ${minLength} characters long`)
	} else if (password.length >= minLength) {
		score += 1
	}

	if (password.length >= 12) {
		score += 1
	}

	if (password.length > 128) {
		errors.push('Password must not exceed 128 characters')
	}

	// Character type requirements
	if (requireUppercase && !/[A-Z]/.test(password)) {
		errors.push('Password must contain at least one uppercase letter')
	} else if (/[A-Z]/.test(password)) {
		score += 1
	}

	if (requireLowercase && !/[a-z]/.test(password)) {
		errors.push('Password must contain at least one lowercase letter')
	} else if (/[a-z]/.test(password)) {
		score += 1
	}

	if (requireNumber && !/\d/.test(password)) {
		errors.push('Password must contain at least one number')
	} else if (/\d/.test(password)) {
		score += 1
	}

	if (requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
		errors.push('Password must contain at least one special character (!@#$%^&* etc.)')
	} else if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
		score += 1
	}

	// Check for common passwords
	if (checkCommon && COMMON_PASSWORDS.has(password.toLowerCase())) {
		errors.push('This password is too common. Please choose a more unique password')
		score = Math.max(0, score - 2)
	}

	// Check for sequential characters
	if (checkSequential && hasSequentialCharacters(password)) {
		errors.push('Password should not contain sequential characters (e.g., 123, abc)')
		score = Math.max(0, score - 1)
	}

	// Check for repeated characters
	if (hasRepeatedCharacters(password)) {
		score = Math.max(0, score - 1)
	}

	// Determine strength based on score
	let strength: PasswordValidationResult['strength']
	if (score <= 2) {
		strength = 'weak'
	} else if (score <= 4) {
		strength = 'fair'
	} else if (score <= 5) {
		strength = 'good'
	} else {
		strength = 'strong'
	}

	return {
		valid: errors.length === 0,
		errors,
		strength,
		score,
	}
}

/**
 * Check if password contains sequential characters
 */
function hasSequentialCharacters(password: string): boolean {
	const sequences = [
		'0123456789',
		'abcdefghijklmnopqrstuvwxyz',
		'qwertyuiop',
		'asdfghjkl',
		'zxcvbnm',
	]

	const lowerPass = password.toLowerCase()

	for (const seq of sequences) {
		// Check forward sequence
		for (let i = 0; i <= seq.length - 3; i++) {
			if (lowerPass.includes(seq.substring(i, i + 3))) {
				return true
			}
		}

		// Check reverse sequence
		const reversed = seq.split('').reverse().join('')
		for (let i = 0; i <= reversed.length - 3; i++) {
			if (lowerPass.includes(reversed.substring(i, i + 3))) {
				return true
			}
		}
	}

	return false
}

/**
 * Check if password has too many repeated characters
 */
function hasRepeatedCharacters(password: string): boolean {
	// Check for 3 or more repeated characters
	return /(.)\1{2,}/.test(password)
}

/**
 * Estimate password entropy in bits
 * Higher entropy = stronger password
 */
export function calculatePasswordEntropy(password: string): number {
	let charsetSize = 0

	if (/[a-z]/.test(password)) charsetSize += 26
	if (/[A-Z]/.test(password)) charsetSize += 26
	if (/\d/.test(password)) charsetSize += 10
	if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) charsetSize += 32

	if (charsetSize === 0) return 0

	// Entropy = log2(charsetSize^length)
	return password.length * Math.log2(charsetSize)
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length = 16): string {
	const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
	const lowercase = 'abcdefghijklmnopqrstuvwxyz'
	const numbers = '0123456789'
	const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
	const all = uppercase + lowercase + numbers + special

	const array = new Uint8Array(length)
	crypto.getRandomValues(array)

	let password = ''
	// Ensure at least one of each required type
	// biome-ignore lint/style/noNonNullAssertion: array indices 0-3 always exist for length >= 4
	password += uppercase[array[0]! % uppercase.length]
	// biome-ignore lint/style/noNonNullAssertion: array indices 0-3 always exist for length >= 4
	password += lowercase[array[1]! % lowercase.length]
	// biome-ignore lint/style/noNonNullAssertion: array indices 0-3 always exist for length >= 4
	password += numbers[array[2]! % numbers.length]
	// biome-ignore lint/style/noNonNullAssertion: array indices 0-3 always exist for length >= 4
	password += special[array[3]! % special.length]

	// Fill the rest randomly
	for (let i = 4; i < length; i++) {
		// biome-ignore lint/style/noNonNullAssertion: i < length === array.length
		password += all[array[i]! % all.length]
	}

	// Shuffle the password using Fisher-Yates
	const chars = password.split('')
	for (let i = chars.length - 1; i > 0; i--) {
		// biome-ignore lint/style/noNonNullAssertion: i % array.length is always in bounds
		const j = array[i % array.length]! % (i + 1)
		// biome-ignore lint/style/noNonNullAssertion: i is a valid index into chars
		const temp = chars[i]!
		// biome-ignore lint/style/noNonNullAssertion: j is computed to be in bounds
		chars[i] = chars[j]!
		chars[j] = temp
	}

	return chars.join('')
}
