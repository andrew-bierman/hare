import { z } from 'zod'

/**
 * User schema for API responses.
 */
export const UserSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	name: z.string(),
})

/**
 * Schema for user sign up.
 */
export const SignUpSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	name: z.string().min(1),
})

/**
 * Schema for user sign in.
 */
export const SignInSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
})

/**
 * Session schema for API responses.
 */
export const SessionSchema = z.object({
	token: z.string(),
	expiresAt: z.string().datetime(),
})

/**
 * Combined auth response schema.
 */
export const AuthResponseSchema = z.object({
	user: UserSchema,
	session: SessionSchema,
})
