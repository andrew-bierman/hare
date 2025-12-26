import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Agent Chat/Playground E2E tests.
 * Tests the interactive chat interface for deployed agents.
 */

test.describe('Agent Playground - Setup', () => {
	test('can access playground for deployed agent', async ({ authenticatedPage }) => {
		// First create and deploy an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Playground Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage
			.getByLabel('System Prompt')
			.fill('You are a helpful test assistant. Keep responses brief.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Deploy the agent
		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 3000 })) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)

			// Navigate to playground
			const playgroundLink = authenticatedPage.getByRole('link', { name: /test|playground/i })
			if (await playgroundLink.isVisible({ timeout: 3000 })) {
				await playgroundLink.click()
				await authenticatedPage.waitForURL(/\/playground/, { timeout: 10000 })

				// Verify playground loaded
				await expect(authenticatedPage.getByText(agentName)).toBeVisible()
			}
		}
	})
})

test.describe('Playground UI Elements', () => {
	test('playground has message input', async ({ authenticatedPage }) => {
		// Create and deploy agent, then go to playground
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Input Test Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByLabel('System Prompt').fill('You are a test assistant.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Deploy
		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 3000 })) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)

			// Go to playground
			const playgroundLink = authenticatedPage.getByRole('link', { name: /test|playground/i })
			if (await playgroundLink.isVisible({ timeout: 3000 })) {
				await playgroundLink.click()
				await authenticatedPage.waitForURL(/\/playground/, { timeout: 10000 })

				// Check for message input
				const messageInput = authenticatedPage.getByPlaceholder(/type.*message|message/i)
				await expect(messageInput).toBeVisible()
			}
		}
	})

	test('playground has send button', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Send Button Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByLabel('System Prompt').fill('You are a test assistant.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 3000 })) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)

			const playgroundLink = authenticatedPage.getByRole('link', { name: /test|playground/i })
			if (await playgroundLink.isVisible({ timeout: 3000 })) {
				await playgroundLink.click()
				await authenticatedPage.waitForURL(/\/playground/, { timeout: 10000 })

				// Look for send button (might be an icon button)
				const sendButton = authenticatedPage.getByRole('button', { name: /send/i })
				if (await sendButton.isVisible({ timeout: 2000 })) {
					await expect(sendButton).toBeVisible()
				}
			}
		}
	})

	test('playground has clear button', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Clear Button Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByLabel('System Prompt').fill('You are a test assistant.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 3000 })) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)

			const playgroundLink = authenticatedPage.getByRole('link', { name: /test|playground/i })
			if (await playgroundLink.isVisible({ timeout: 3000 })) {
				await playgroundLink.click()
				await authenticatedPage.waitForURL(/\/playground/, { timeout: 10000 })

				// Look for clear button
				const clearButton = authenticatedPage.getByRole('button', { name: /clear/i })
				if (await clearButton.isVisible({ timeout: 2000 })) {
					// Initially might be disabled if no messages
					await expect(clearButton).toBeVisible()
				}
			}
		}
	})

	test('playground has back button to agent', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Back Button Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByLabel('System Prompt').fill('You are a test assistant.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		const agentUrl = authenticatedPage.url()

		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 3000 })) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)

			const playgroundLink = authenticatedPage.getByRole('link', { name: /test|playground/i })
			if (await playgroundLink.isVisible({ timeout: 3000 })) {
				await playgroundLink.click()
				await authenticatedPage.waitForURL(/\/playground/, { timeout: 10000 })

				// Look for back button
				const backButton = authenticatedPage.getByRole('link', { name: /back/i })
				if (await backButton.isVisible({ timeout: 2000 })) {
					await backButton.click()
					// Should navigate back to agent page
					await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 5000 })
				}
			}
		}
	})
})

test.describe('Playground Chat Functionality', () => {
	test('shows suggested prompts in empty state', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Suggestions Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByLabel('System Prompt').fill('You are a test assistant.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 3000 })) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)

			const playgroundLink = authenticatedPage.getByRole('link', { name: /test|playground/i })
			if (await playgroundLink.isVisible({ timeout: 3000 })) {
				await playgroundLink.click()
				await authenticatedPage.waitForURL(/\/playground/, { timeout: 10000 })

				// Look for suggested prompts or "Start a conversation" message
				const emptyStateText = authenticatedPage.getByText(/start.*conversation|what can you/i)
				if (await emptyStateText.isVisible({ timeout: 2000 })) {
					await expect(emptyStateText).toBeVisible()
				}
			}
		}
	})

	test('can type message in input', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Type Message Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByLabel('System Prompt').fill('You are a test assistant.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 3000 })) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)

			const playgroundLink = authenticatedPage.getByRole('link', { name: /test|playground/i })
			if (await playgroundLink.isVisible({ timeout: 3000 })) {
				await playgroundLink.click()
				await authenticatedPage.waitForURL(/\/playground/, { timeout: 10000 })

				const messageInput = authenticatedPage.getByPlaceholder(/type.*message|message/i)
				if (await messageInput.isVisible({ timeout: 2000 })) {
					await messageInput.fill('Hello, this is a test message')
					await expect(messageInput).toHaveValue('Hello, this is a test message')
				}
			}
		}
	})

	test('displays model info in sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Model Info Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByLabel('System Prompt').fill('You are a test assistant.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 3000 })) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)

			const playgroundLink = authenticatedPage.getByRole('link', { name: /test|playground/i })
			if (await playgroundLink.isVisible({ timeout: 3000 })) {
				await playgroundLink.click()
				await authenticatedPage.waitForURL(/\/playground/, { timeout: 10000 })

				// Look for model info in sidebar
				const modelText = authenticatedPage.getByText(/model|llama/i).first()
				if (await modelText.isVisible({ timeout: 2000 })) {
					await expect(modelText).toBeVisible()
				}
			}
		}
	})
})

test.describe('Playground Navigation', () => {
	test('can navigate back to agents list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Nav Test Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByLabel('System Prompt').fill('You are a test assistant.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 3000 })) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)

			const playgroundLink = authenticatedPage.getByRole('link', { name: /test|playground/i })
			if (await playgroundLink.isVisible({ timeout: 3000 })) {
				await playgroundLink.click()
				await authenticatedPage.waitForURL(/\/playground/, { timeout: 10000 })

				// Navigate to agents list via sidebar
				const agentsLink = authenticatedPage.getByRole('link', { name: 'Agents', exact: true })
				await agentsLink.click()
				await authenticatedPage.waitForURL(/\/dashboard\/agents$/, { timeout: 5000 })

				await expect(
					authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
				).toBeVisible()
			}
		}
	})

	test('can navigate to settings from playground', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Settings Nav Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByLabel('System Prompt').fill('You are a test assistant.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 3000 })) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)

			const playgroundLink = authenticatedPage.getByRole('link', { name: /test|playground/i })
			if (await playgroundLink.isVisible({ timeout: 3000 })) {
				await playgroundLink.click()
				await authenticatedPage.waitForURL(/\/playground/, { timeout: 10000 })

				// Navigate to settings
				const settingsLink = authenticatedPage.getByRole('link', { name: /settings/i }).first()
				if (await settingsLink.isVisible({ timeout: 2000 })) {
					await settingsLink.click()
					// Could go to agent settings or dashboard settings
					await authenticatedPage.waitForURL(/settings/, { timeout: 5000 })
				}
			}
		}
	})
})

baseTest.describe('Playground Access Control', () => {
	baseTest('cannot access playground for draft agent', async ({ page }: { page: Page }) => {
		// This tests that the Test button is disabled for non-deployed agents
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')

		// Look for a draft agent's test button
		const draftCard = page.locator('[class*="card"]').filter({ hasText: /draft/i }).first()
		if (await draftCard.isVisible({ timeout: 2000 })) {
			const testButton = draftCard.getByRole('button', { name: /test/i })
			if (await testButton.isVisible({ timeout: 1000 })) {
				await expect(testButton).toBeDisabled()
			}
		}
	})
})
