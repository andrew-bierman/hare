/**
 * Simple structured logger for edge-compatible environments.
 * Provides consistent logging with context and proper error formatting.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
	[key: string]: unknown
}

interface LogEntry {
	level: LogLevel
	message: string
	timestamp: string
	context?: LogContext
	error?: {
		name: string
		message: string
		stack?: string
	}
}

function formatError(error: unknown): LogEntry['error'] | undefined {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		}
	}
	if (error !== undefined && error !== null) {
		return {
			name: 'UnknownError',
			message: String(error),
		}
	}
	return undefined
}

function createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: unknown): LogEntry {
	const entry: LogEntry = {
		level,
		message,
		timestamp: new Date().toISOString(),
	}

	if (context && Object.keys(context).length > 0) {
		entry.context = context
	}

	const formattedError = formatError(error)
	if (formattedError) {
		entry.error = formattedError
	}

	return entry
}

function logToConsole(entry: LogEntry): void {
	const output = JSON.stringify(entry)

	switch (entry.level) {
		case 'debug':
			console.debug(output)
			break
		case 'info':
			console.info(output)
			break
		case 'warn':
			console.warn(output)
			break
		case 'error':
			console.error(output)
			break
	}
}

/**
 * Logger interface for structured logging.
 */
export const logger = {
	debug(message: string, context?: LogContext): void {
		logToConsole(createLogEntry('debug', message, context))
	},

	info(message: string, context?: LogContext): void {
		logToConsole(createLogEntry('info', message, context))
	},

	warn(message: string, context?: LogContext, error?: unknown): void {
		logToConsole(createLogEntry('warn', message, context, error))
	},

	error(message: string, context?: LogContext, error?: unknown): void {
		logToConsole(createLogEntry('error', message, context, error))
	},
}

/**
 * Create a child logger with preset context.
 */
export function createLogger(baseContext: LogContext) {
	return {
		debug(message: string, context?: LogContext): void {
			logger.debug(message, { ...baseContext, ...context })
		},

		info(message: string, context?: LogContext): void {
			logger.info(message, { ...baseContext, ...context })
		},

		warn(message: string, context?: LogContext, error?: unknown): void {
			logger.warn(message, { ...baseContext, ...context }, error)
		},

		error(message: string, context?: LogContext, error?: unknown): void {
			logger.error(message, { ...baseContext, ...context }, error)
		},
	}
}
