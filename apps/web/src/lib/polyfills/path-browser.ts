/**
 * Minimal path polyfill for browser environments.
 * Only used by fumadocs via targeted Vite plugin.
 */
export const sep = '/'
export const delimiter = ':'

export function join(...parts: string[]): string {
	return parts.filter(Boolean).join('/').replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

export function basename(path: string, ext?: string): string {
	const base = path.split('/').pop() || ''
	if (ext && base.endsWith(ext)) {
		return base.slice(0, -ext.length)
	}
	return base
}

export function dirname(path: string): string {
	const parts = path.split('/')
	parts.pop()
	return parts.join('/') || '/'
}

export function extname(path: string): string {
	const base = basename(path)
	const idx = base.lastIndexOf('.')
	return idx > 0 ? base.slice(idx) : ''
}

export function resolve(...parts: string[]): string {
	return join(...parts)
}

export function normalize(path: string): string {
	return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

export function isAbsolute(path: string): boolean {
	return path.startsWith('/')
}

export function relative(_from: string, to: string): string {
	return to
}

export default {
	sep,
	delimiter,
	join,
	basename,
	dirname,
	extname,
	resolve,
	normalize,
	isAbsolute,
	relative,
}
