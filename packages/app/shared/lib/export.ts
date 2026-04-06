/**
 * Export utilities for downloading data as CSV or JSON
 */

/**
 * Sanitize a value for CSV export to prevent formula injection.
 * Excel and similar spreadsheet applications interpret cells starting with
 * =, +, -, @ as formulas, which can be a security risk.
 */
function sanitizeCSVValue(value: unknown): string {
	const str = String(value ?? '')

	// Prevent formula injection by escaping values that start with dangerous characters
	// Excel and similar tools interpret =, +, -, @ as formula starters
	if (str.length > 0 && /^[=+\-@]/.test(str)) {
		// Prefix with a single quote to treat as text
		return `'${str}`
	}

	return str
}

export function exportToCSV(opts: { data: Record<string, unknown>[]; filename: string }) {
	const { data, filename } = opts
	const firstRow = data[0]
	if (!firstRow) return

	const headers = Object.keys(firstRow)
	const csvContent = [
		headers.join(','),
		...data.map((row) => headers.map((h) => JSON.stringify(sanitizeCSVValue(row[h]))).join(',')),
	].join('\n')

	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
	const link = document.createElement('a')
	link.href = URL.createObjectURL(blob)
	link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
	link.click()
}

export function exportToJSON(opts: { data: unknown; filename: string }) {
	const { data, filename } = opts
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
	const link = document.createElement('a')
	link.href = URL.createObjectURL(blob)
	link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`
	link.click()
}
