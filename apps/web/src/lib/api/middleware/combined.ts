import { every } from 'hono/combine'
import { authMiddleware, optionalAuthMiddleware } from './auth'
import { workspaceMiddleware, requirePermission } from './workspace'
import { apiRateLimiter, chatRateLimiter, strictRateLimiter } from './rate-limit'

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
 * Use for: create, update operations
 */
export const writeRoute = every(authMiddleware, workspaceMiddleware, requirePermission('write'))

/**
 * Admin-only protected route (admin+ access)
 * Use for: delete, deploy operations
 */
export const adminRoute = every(authMiddleware, workspaceMiddleware, requirePermission('admin'))

/**
 * Owner-only protected route
 * Use for: workspace deletion, ownership transfer
 */
export const ownerRoute = every(authMiddleware, workspaceMiddleware, requirePermission('owner'))

/**
 * Rate-limited protected routes
 */
export const rateLimitedRoute = every(apiRateLimiter, authMiddleware, workspaceMiddleware)

/**
 * Strict rate-limited admin route (for sensitive operations like deploy)
 */
export const strictAdminRoute = every(strictRateLimiter, authMiddleware, workspaceMiddleware, requirePermission('admin'))

/**
 * Chat route with rate limiting (optional auth)
 */
export const chatRoute = every(chatRateLimiter, optionalAuthMiddleware)
