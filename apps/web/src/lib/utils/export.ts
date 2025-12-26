/**
 * Export utilities for downloading data as CSV or JSON
 */

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
	if (!data.length) return

	const headers = Object.keys(data[0])
	const csvContent = [
		headers.join(','),
		...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
	].join('\n')

	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
	const link = document.createElement('a')
	link.href = URL.createObjectURL(blob)
	link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
	link.click()
}

export function exportToJSON(data: unknown, filename: string) {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
	const link = document.createElement('a')
	link.href = URL.createObjectURL(blob)
	link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`
	link.click()
}
