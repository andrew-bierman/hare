import { requestValidation } from '@hare/security'
import { every } from 'hono/combine'
import { authMiddleware, optionalAuthMiddleware } from './auth'
import { apiRateLimiter, chatRateLimiter, strictRateLimiter } from './rate-limit'
import { requirePermission, workspaceMiddleware } from './workspace'

/**
 * Security middleware instances
 * - Request validation: enforces size limits and blocks dangerous headers
 *
 * Note: CSRF protection removed — Better Auth handles its own CSRF,
 * and session cookies use SameSite=Lax which prevents cross-origin requests.
 */
const reqValidation = requestValidation()

/**
 * Pre-combined middleware chains for common route patterns.
 * Using Hono's `every` helper from 'hono/combine' for cleaner composition.
 */

/**
 * Base authenticated route - requires valid session
 */
export const authenticated = authMiddleware

/**
 * Base authenticated + workspace route - requires session and workspace access
 */
export const protectedRoute = every(authMiddleware, workspaceMiddleware)

/**
 * Read-only protected route (viewer+ access)
 */
export const readRoute = every(authMiddleware, workspaceMiddleware, requirePermission('read'))

/**
 * Write-enabled protected route (member+ access)
 */
export const writeRoute = every(
	reqValidation,
	authMiddleware,
	workspaceMiddleware,
	requirePermission('write'),
)

/**
 * Admin-only protected route (admin+ access)
 */
export const adminRoute = every(
	reqValidation,
	authMiddleware,
	workspaceMiddleware,
	requirePermission('admin'),
)

/**
 * Owner-only protected route
 */
export const ownerRoute = every(
	reqValidation,
	authMiddleware,
	workspaceMiddleware,
	requirePermission('owner'),
)

/**
 * Rate-limited protected routes
 */
export const rateLimitedRoute = every(apiRateLimiter, authMiddleware, workspaceMiddleware)

/**
 * Strict rate-limited admin route (for sensitive operations like deploy)
 */
export const strictAdminRoute = every(
	reqValidation,
	strictRateLimiter,
	authMiddleware,
	workspaceMiddleware,
	requirePermission('admin'),
)

/**
 * Chat route with rate limiting (optional auth)
 */
export const chatRoute = every(chatRateLimiter, optionalAuthMiddleware)
