// Run after bun run build:tauri. This checks the packaged frontend, not native Tauri.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = fileURLToPath(new URL('../../tauri/dist/static/', import.meta.url))
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }
const server = createServer(async (req, res) => {
	const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
	const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
	if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
		res.writeHead(403).end()
		return
	}
	try {
		const body = await readFile(file)
		res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }).end(body)
	} catch {
		res.writeHead(404).end()
	}
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
let browser
try {
	browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
	const page = await browser.newPage()
	const errors = []
	page.on('pageerror', (error) => errors.push(error.message))
	// Never send acceptance traffic to a live backend.
	const origin = `http://127.0.0.1:${server.address().port}`
	await page.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
	await page.goto(origin)
	await page.waitForFunction(() => document.body.innerText.trim().length > 0)
	assert.deepEqual(errors, [], 'Packaged desktop frontend must hydrate without page errors')
	console.log('PASS: packaged desktop frontend renders:', await page.locator('body').innerText())
} finally {
	await browser?.close()
	await new Promise((resolve) => server.close(resolve))
}
