import { z } from '@hono/zod-openapi'

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
 * Schema for user sign up.
 */
export const SignUpSchema = z
	.object({
		email: z.string().email().openapi({ example: 'user@example.com' }),
		password: z.string().min(8).openapi({ example: 'password123' }),
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
