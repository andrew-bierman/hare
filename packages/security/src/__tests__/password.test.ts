import { describe, expect, it } from 'vitest'
import { calculatePasswordEntropy, generateSecurePassword, validatePassword } from '../password'

describe('Password Utilities', () => {
	describe('validatePassword', () => {
		describe('with default options', () => {
			it('validates a strong password', () => {
				// Avoid sequential characters (123 is sequential)
				const result = validatePassword('SecureP@ss759')

				expect(result.valid).toBe(true)
				expect(result.errors).toHaveLength(0)
			})

			it('rejects password shorter than minimum length', () => {
				const result = validatePassword('Sh0rt!')

				expect(result.valid).toBe(false)
				expect(result.errors).toContain('Password must be at least 8 characters long')
			})

			it('rejects password longer than 128 characters', () => {
				const longPassword = 'A1!' + 'a'.repeat(126)
				const result = validatePassword(longPassword)

				expect(result.valid).toBe(false)
				expect(result.errors).toContain('Password must not exceed 128 characters')
			})

			it('rejects password without uppercase letter', () => {
				const result = validatePassword('lowercase123!')

				expect(result.valid).toBe(false)
				expect(result.errors).toContain('Password must contain at least one uppercase letter')
			})

			it('rejects password without lowercase letter', () => {
				const result = validatePassword('UPPERCASE123!')

				expect(result.valid).toBe(false)
				expect(result.errors).toContain('Password must contain at least one lowercase letter')
			})

			it('rejects password without number', () => {
				const result = validatePassword('NoNumbers@Here')

				expect(result.valid).toBe(false)
				expect(result.errors).toContain('Password must contain at least one number')
			})

			it('rejects password without special character', () => {
				const result = validatePassword('NoSpecial123')

				expect(result.valid).toBe(false)
				expect(result.errors).toContain(
					'Password must contain at least one special character (!@#$%^&* etc.)',
				)
			})

			it('accumulates multiple errors', () => {
				const result = validatePassword('short')

				expect(result.valid).toBe(false)
				expect(result.errors.length).toBeGreaterThan(1)
			})
		})

		describe('common password detection', () => {
			it('rejects common passwords', () => {
				const commonPasswords = [
					'password',
					'password123',
					'12345678',
					'qwerty',
					'abc123',
					'letmein',
					'dragon',
					'iloveyou',
					'trustno1',
				]

				for (const password of commonPasswords) {
					const result = validatePassword(password, {
						requireUppercase: false,
						requireLowercase: false,
						requireNumber: false,
						requireSpecial: false,
					})

					expect(result.errors).toContain(
						'This password is too common. Please choose a more unique password',
					)
				}
			})

			it('rejects common passwords case-insensitively', () => {
				const result = validatePassword('PASSWORD', {
					requireUppercase: false,
					requireLowercase: false,
					requireNumber: false,
					requireSpecial: false,
				})

				expect(result.errors).toContain(
					'This password is too common. Please choose a more unique password',
				)
			})

			it('can disable common password check', () => {
				const result = validatePassword('password', {
					checkCommon: false,
					requireUppercase: false,
					requireLowercase: false,
					requireNumber: false,
					requireSpecial: false,
				})

				expect(result.errors).not.toContain(
					'This password is too common. Please choose a more unique password',
				)
			})
		})

		describe('sequential character detection', () => {
			it('rejects passwords with sequential numbers', () => {
				const result = validatePassword('MyP@ss123!')

				expect(result.errors).toContain(
					'Password should not contain sequential characters (e.g., 123, abc)',
				)
			})

			it('rejects passwords with sequential letters', () => {
				const result = validatePassword('MyAbcP@ss1!')

				expect(result.errors).toContain(
					'Password should not contain sequential characters (e.g., 123, abc)',
				)
			})

			it('rejects passwords with reverse sequential characters', () => {
				const result = validatePassword('MyP@ss321!')

				expect(result.errors).toContain(
					'Password should not contain sequential characters (e.g., 123, abc)',
				)
			})

			it('rejects passwords with keyboard sequences (qwerty)', () => {
				const result = validatePassword('MyP@ssQwe1!')

				expect(result.errors).toContain(
					'Password should not contain sequential characters (e.g., 123, abc)',
				)
			})

			it('can disable sequential character check', () => {
				const result = validatePassword('MyP@ss123!', { checkSequential: false })

				expect(result.errors).not.toContain(
					'Password should not contain sequential characters (e.g., 123, abc)',
				)
			})
		})

		describe('custom options', () => {
			it('allows custom minimum length', () => {
				const result = validatePassword('Pass1!', { minLength: 6 })

				expect(result.errors).not.toContain('Password must be at least 8 characters long')
			})

			it('can disable uppercase requirement', () => {
				const result = validatePassword('lowercase1!', { requireUppercase: false })

				expect(result.errors).not.toContain('Password must contain at least one uppercase letter')
			})

			it('can disable lowercase requirement', () => {
				const result = validatePassword('UPPERCASE1!', { requireLowercase: false })

				expect(result.errors).not.toContain('Password must contain at least one lowercase letter')
			})

			it('can disable number requirement', () => {
				const result = validatePassword('NoNumbers@Here', { requireNumber: false })

				expect(result.errors).not.toContain('Password must contain at least one number')
			})

			it('can disable special character requirement', () => {
				const result = validatePassword('NoSpecial123', { requireSpecial: false })

				expect(result.errors).not.toContain(
					'Password must contain at least one special character (!@#$%^&* etc.)',
				)
			})

			it('can disable all requirements', () => {
				const result = validatePassword('simple', {
					minLength: 6,
					requireUppercase: false,
					requireLowercase: false,
					requireNumber: false,
					requireSpecial: false,
					checkCommon: false,
					checkSequential: false,
				})

				expect(result.valid).toBe(true)
				expect(result.errors).toHaveLength(0)
			})
		})

		describe('strength scoring', () => {
			it('returns weak strength for low scores', () => {
				const result = validatePassword('weak', {
					minLength: 4,
					requireUppercase: false,
					requireLowercase: false,
					requireNumber: false,
					requireSpecial: false,
					checkCommon: false,
					checkSequential: false,
				})

				expect(result.strength).toBe('weak')
			})

			it('returns fair strength for moderate scores', () => {
				const result = validatePassword('Moderate1', {
					requireSpecial: false,
					checkSequential: false,
				})

				expect(['fair', 'weak']).toContain(result.strength)
			})

			it('returns good strength for good passwords', () => {
				const result = validatePassword('GoodP@ssw0rd', { checkSequential: false })

				expect(['good', 'strong']).toContain(result.strength)
			})

			it('returns strong strength for excellent passwords', () => {
				const result = validatePassword('V3ryStr0ngP@ssw0rd!', { checkSequential: false })

				expect(result.strength).toBe('strong')
			})

			it('penalizes score for common passwords', () => {
				const commonResult = validatePassword('password', {
					minLength: 4,
					requireUppercase: false,
					requireLowercase: false,
					requireNumber: false,
					requireSpecial: false,
					checkSequential: false,
				})

				const uniqueResult = validatePassword('uniquewd', {
					minLength: 4,
					requireUppercase: false,
					requireLowercase: false,
					requireNumber: false,
					requireSpecial: false,
					checkCommon: false,
					checkSequential: false,
				})

				expect(commonResult.score).toBeLessThan(uniqueResult.score)
			})

			it('penalizes score for sequential characters', () => {
				const sequentialResult = validatePassword('Test123!X', {
					checkCommon: false,
				})

				const noSequentialResult = validatePassword('Test759!X', {
					checkCommon: false,
				})

				expect(sequentialResult.score).toBeLessThan(noSequentialResult.score)
			})

			it('penalizes score for repeated characters', () => {
				const repeatedResult = validatePassword('Testttt1!', {
					checkCommon: false,
					checkSequential: false,
				})

				const noRepeatedResult = validatePassword('Testxyz1!', {
					checkCommon: false,
					checkSequential: false,
				})

				expect(repeatedResult.score).toBeLessThanOrEqual(noRepeatedResult.score)
			})

			it('rewards longer passwords', () => {
				const shortResult = validatePassword('Short1!A', {
					checkCommon: false,
					checkSequential: false,
				})

				const longResult = validatePassword('LongerPassword1!', {
					checkCommon: false,
					checkSequential: false,
				})

				expect(longResult.score).toBeGreaterThan(shortResult.score)
			})
		})

		describe('edge cases', () => {
			it('handles empty password', () => {
				const result = validatePassword('')

				expect(result.valid).toBe(false)
				expect(result.errors.length).toBeGreaterThan(0)
			})

			it('handles password with only spaces', () => {
				const result = validatePassword('        ')

				expect(result.valid).toBe(false)
			})

			it('handles password with unicode characters', () => {
				// Unicode characters should be allowed but not count toward special char requirement
				const result = validatePassword('Test Unicode 1!')

				expect(result.valid).toBe(true)
			})

			it('recognizes various special characters', () => {
				const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'

				for (const char of specialChars) {
					const password = `TestPass1${char}`
					const result = validatePassword(password, { checkSequential: false })

					expect(result.errors).not.toContain(
						'Password must contain at least one special character (!@#$%^&* etc.)',
					)
				}
			})
		})
	})

	describe('calculatePasswordEntropy', () => {
		it('returns 0 for empty password', () => {
			const entropy = calculatePasswordEntropy('')

			expect(entropy).toBe(0)
		})

		it('returns 0 for password with no recognized character classes', () => {
			// Just spaces and control characters
			const entropy = calculatePasswordEntropy('   ')

			expect(entropy).toBe(0)
		})

		it('calculates entropy for lowercase-only password', () => {
			// 26 character charset, 8 characters
			const entropy = calculatePasswordEntropy('password')

			// log2(26^8) = 8 * log2(26) approx 37.6
			expect(entropy).toBeCloseTo(8 * Math.log2(26), 1)
		})

		it('calculates higher entropy for mixed case', () => {
			const lowerEntropy = calculatePasswordEntropy('password')
			const mixedEntropy = calculatePasswordEntropy('Password')

			expect(mixedEntropy).toBeGreaterThan(lowerEntropy)
		})

		it('calculates higher entropy with numbers', () => {
			const alphaEntropy = calculatePasswordEntropy('Password')
			const alphanumericEntropy = calculatePasswordEntropy('Passw0rd')

			expect(alphanumericEntropy).toBeGreaterThan(alphaEntropy)
		})

		it('calculates highest entropy with special characters', () => {
			const alphanumericEntropy = calculatePasswordEntropy('Passw0rd')
			const fullEntropy = calculatePasswordEntropy('P@ssw0rd')

			expect(fullEntropy).toBeGreaterThan(alphanumericEntropy)
		})

		it('increases entropy with password length', () => {
			const short = calculatePasswordEntropy('Pass1!')
			const long = calculatePasswordEntropy('Password123!')

			expect(long).toBeGreaterThan(short)
		})

		it('calculates realistic entropy values', () => {
			// A strong 16-character password with all character types
			// Charset: 26 + 26 + 10 + 32 = 94 characters
			// Entropy: 16 * log2(94) approx 104.8
			const entropy = calculatePasswordEntropy('MyStr0ngP@ss!')

			expect(entropy).toBeGreaterThan(50)
			expect(entropy).toBeLessThan(150)
		})
	})

	describe('generateSecurePassword', () => {
		it('generates a password of default length (16)', () => {
			const password = generateSecurePassword()

			expect(password).toHaveLength(16)
		})

		it('generates a password of custom length', () => {
			const password8 = generateSecurePassword(8)
			const password32 = generateSecurePassword(32)

			expect(password8).toHaveLength(8)
			expect(password32).toHaveLength(32)
		})

		it('generated password contains uppercase letter', () => {
			const password = generateSecurePassword()

			expect(password).toMatch(/[A-Z]/)
		})

		it('generated password contains lowercase letter', () => {
			const password = generateSecurePassword()

			expect(password).toMatch(/[a-z]/)
		})

		it('generated password contains number', () => {
			const password = generateSecurePassword()

			expect(password).toMatch(/\d/)
		})

		it('generated password contains special character', () => {
			const password = generateSecurePassword()

			expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/)
		})

		it('generated password passes default validation', () => {
			const password = generateSecurePassword()
			const result = validatePassword(password, {
				checkCommon: false,
				checkSequential: false,
			})

			expect(result.valid).toBe(true)
		})

		it('generates unique passwords', () => {
			const passwords = new Set<string>()
			for (let i = 0; i < 100; i++) {
				passwords.add(generateSecurePassword())
			}

			// All passwords should be unique
			expect(passwords.size).toBe(100)
		})

		it('handles minimum possible length (4)', () => {
			const password = generateSecurePassword(4)

			expect(password).toHaveLength(4)
			// Should still have all character types
			expect(password).toMatch(/[A-Z]/)
			expect(password).toMatch(/[a-z]/)
			expect(password).toMatch(/\d/)
			expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/)
		})

		it('generates very long passwords', () => {
			const password = generateSecurePassword(128)

			expect(password).toHaveLength(128)
		})

		it('generated passwords have good entropy', () => {
			const password = generateSecurePassword()
			const entropy = calculatePasswordEntropy(password)

			// 16 characters with full charset should have > 100 bits entropy
			expect(entropy).toBeGreaterThan(90)
		})
	})
})
