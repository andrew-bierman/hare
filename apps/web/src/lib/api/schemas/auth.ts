import { z } from '@hono/zod-openapi'
import { validatePassword } from 'web-app/lib/security/password'

/**
 * User schema for API responses.
 */
export const UserSchema = z
	.object({
		id: z.string().openapi({ example: 'user_abc123' }),
		email: z.string().email().openapi({ example: 'user@example.com' }),
		name: z.string().openapi({ example: 'John Doe' }),
	})
	.openapi('User')

/**
 * Strong password schema with comprehensive validation
 */
const strongPasswordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.max(128, 'Password must not exceed 128 characters')
	.refine(
		(password) => {
			const result = validatePassword(password)
			return result.valid
		},
		(password) => {
			const result = validatePassword(password)
			return {
				message:
					result.errors.length > 0
						? result.errors.join('. ')
						: 'Password does not meet security requirements',
			}
		},
	)

/**
 * Schema for user sign up.
 */
export const SignUpSchema = z
	.object({
		email: z.string().email().openapi({ example: 'user@example.com' }),
		password: strongPasswordSchema.openapi({
			example: 'SecureP@ssw0rd!',
			description:
				'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character',
		}),
		name: z.string().min(1).openapi({ example: 'John Doe' }),
	})
	.openapi('SignUp')

/**
 * Schema for user sign in.
 */
export const SignInSchema = z
	.object({
		email: z.string().email().openapi({ example: 'user@example.com' }),
		password: z.string().min(1).openapi({ example: 'password123' }),
	})
	.openapi('SignIn')

/**
 * Session schema for API responses.
 */
export const SessionSchema = z
	.object({
		token: z.string().openapi({ example: 'session_xyz789' }),
		expiresAt: z.string().datetime().openapi({ example: '2024-12-08T00:00:00Z' }),
	})
	.openapi('Session')

/**
 * Combined auth response schema.
 */
export const AuthResponseSchema = z
	.object({
		user: UserSchema,
		session: SessionSchema,
	})
	.openapi('AuthResponse')
