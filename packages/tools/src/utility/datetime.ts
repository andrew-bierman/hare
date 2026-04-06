import { getErrorMessage } from '@hare/checks'
import { z } from 'zod'
import { createTool, failure, success, type ToolResult } from '../types'
import { DatetimeOutputSchema } from './schemas'

/**
 * DateTime Tool - Get current time, format dates, calculate differences.
 */
export const datetimeTool = createTool({
	id: 'datetime',
	description:
		'Get current date/time, format dates, parse dates, or calculate time differences. Supports ISO 8601 and common formats.',
	outputSchema: DatetimeOutputSchema,
	inputSchema: z.object({
		operation: z
			.enum(['now', 'format', 'parse', 'diff', 'add', 'subtract'])
			.describe('Operation to perform'),
		date: z.string().optional().describe('Date string to operate on (ISO 8601 or common formats)'),
		date2: z.string().optional().describe('Second date for diff operation'),
		format: z
			.string()
			.optional()
			.describe(
				'Output format: "iso", "date", "time", "datetime", "relative", "unix", or custom format tokens',
			),
		timezone: z
			.string()
			.optional()
			.default('UTC')
			.describe('Timezone (e.g., "America/New_York", "UTC")'),
		amount: z.number().optional().describe('Amount to add/subtract'),
		unit: z
			.enum(['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds'])
			.optional()
			.describe('Unit for add/subtract'),
	}),
	execute: async (params, _context): Promise<ToolResult<unknown>> => {
		try {
			const { operation, date, date2, format, timezone, amount, unit } = params

			const parseDate = (d?: string): Date => {
				if (!d) return new Date()
				const parsed = new Date(d)
				if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${d}`)
				return parsed
			}

			const formatDate = (d: Date, fmt?: string, tz?: string): string => {
				const options: Intl.DateTimeFormatOptions = { timeZone: tz || 'UTC' }

				switch (fmt) {
					case 'iso':
						return d.toISOString()
					case 'date':
						return d.toLocaleDateString('en-US', { ...options, dateStyle: 'full' })
					case 'time':
						return d.toLocaleTimeString('en-US', { ...options, timeStyle: 'medium' })
					case 'datetime':
						return d.toLocaleString('en-US', { ...options, dateStyle: 'full', timeStyle: 'medium' })
					case 'unix':
						return String(Math.floor(d.getTime() / 1000))
					case 'relative': {
						const now = new Date()
						const diffMs = now.getTime() - d.getTime()
						const diffSec = Math.abs(Math.floor(diffMs / 1000))
						const diffMin = Math.floor(diffSec / 60)
						const diffHour = Math.floor(diffMin / 60)
						const diffDay = Math.floor(diffHour / 24)

						const past = diffMs > 0
						if (diffSec < 60) return past ? 'just now' : 'in a moment'
						if (diffMin < 60) return past ? `${diffMin} minutes ago` : `in ${diffMin} minutes`
						if (diffHour < 24) return past ? `${diffHour} hours ago` : `in ${diffHour} hours`
						if (diffDay < 30) return past ? `${diffDay} days ago` : `in ${diffDay} days`
						return d.toLocaleDateString('en-US', options)
					}
					default:
						return d.toISOString()
				}
			}

			switch (operation) {
				case 'now': {
					const now = new Date()
					return success({
						iso: now.toISOString(),
						unix: Math.floor(now.getTime() / 1000),
						formatted: formatDate(now, format, timezone),
						timezone,
					})
				}

				case 'format': {
					const d = parseDate(date)
					return success({
						original: date,
						formatted: formatDate(d, format, timezone),
						iso: d.toISOString(),
					})
				}

				case 'parse': {
					const d = parseDate(date)
					return success({
						original: date,
						iso: d.toISOString(),
						unix: Math.floor(d.getTime() / 1000),
						year: d.getUTCFullYear(),
						month: d.getUTCMonth() + 1,
						day: d.getUTCDate(),
						hour: d.getUTCHours(),
						minute: d.getUTCMinutes(),
						second: d.getUTCSeconds(),
						dayOfWeek: [
							'Sunday',
							'Monday',
							'Tuesday',
							'Wednesday',
							'Thursday',
							'Friday',
							'Saturday',
						][d.getUTCDay()],
					})
				}

				case 'diff': {
					const d1 = parseDate(date)
					const d2 = parseDate(date2)
					const diffMs = d2.getTime() - d1.getTime()
					const diffSec = diffMs / 1000
					const diffMin = diffSec / 60
					const diffHour = diffMin / 60
					const diffDay = diffHour / 24

					return success({
						milliseconds: diffMs,
						seconds: Math.floor(diffSec),
						minutes: Math.floor(diffMin),
						hours: Math.floor(diffHour),
						days: Math.floor(diffDay),
						weeks: Math.floor(diffDay / 7),
						humanReadable:
							Math.abs(diffDay) >= 1
								? `${Math.abs(Math.floor(diffDay))} days`
								: Math.abs(diffHour) >= 1
									? `${Math.abs(Math.floor(diffHour))} hours`
									: `${Math.abs(Math.floor(diffMin))} minutes`,
					})
				}

				case 'add':
				case 'subtract': {
					if (amount === undefined || !unit) {
						return failure('Amount and unit are required for add/subtract operations')
					}
					const d = parseDate(date)
					const multiplier = operation === 'subtract' ? -1 : 1
					const ms = amount * multiplier

					switch (unit) {
						case 'milliseconds':
							d.setTime(d.getTime() + ms)
							break
						case 'seconds':
							d.setTime(d.getTime() + ms * 1000)
							break
						case 'minutes':
							d.setTime(d.getTime() + ms * 60 * 1000)
							break
						case 'hours':
							d.setTime(d.getTime() + ms * 60 * 60 * 1000)
							break
						case 'days':
							d.setDate(d.getDate() + amount * multiplier)
							break
						case 'weeks':
							d.setDate(d.getDate() + amount * 7 * multiplier)
							break
						case 'months':
							d.setMonth(d.getMonth() + amount * multiplier)
							break
						case 'years':
							d.setFullYear(d.getFullYear() + amount * multiplier)
							break
					}

					return success({
						original: date || new Date().toISOString(),
						result: d.toISOString(),
						formatted: formatDate(d, format, timezone),
					})
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`DateTime error: ${getErrorMessage(error)}`)
		}
	},
})
