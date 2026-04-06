/**
 * Embed Routes
 *
 * Re-exports the embed public routes. The full implementation lives in
 * embed-public.ts which provides public (no-auth) endpoints for embedded
 * agent widgets with SSE streaming.
 */

export { embedPublicRoutes as embedRoutes } from './embed-public'
