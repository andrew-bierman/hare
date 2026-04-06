import { createConsola } from 'consola'

/**
 * Shared application logger using consola.
 *
 * Usage:
 *   import { logger } from '@hare/config'
 *   logger.info('Server started', { port: 8787 })
 *   logger.error('Request failed', error)
 *   logger.warn('Deprecated API called')
 *   logger.debug('Processing request', { id })
 *
 * Create scoped loggers for specific modules:
 *   const log = logger.withTag('api')
 *   log.info('Route registered')
 */
export const logger = createConsola({
	level: process.env.NODE_ENV === 'test' ? 0 : 3,
})
