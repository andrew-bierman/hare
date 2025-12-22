import { expect, test } from './fixtures/test-fixtures'

test.describe('Agents', () => {
	test('agents list page loads', async ({ page }) => {
		await page.goto('/dashboard/agents')
	})

	test('new agent page has form', async ({ page }) => {
		await page.goto('/dashboard/agents/new')
		await expect(page.getByLabel(/name/i)).toBeVisible()
	})
})
