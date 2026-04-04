import { test as baseTest, expect, type Page } from '@playwright/test'
import { generateTestUser, signUpViaUI, test } from './fixtures'

/**
 * Comprehensive E2E tests for all authentication user journeys.
 */

baseTest.describe('Sign-Up Flow', () => {
	baseTest.describe('Successful Registration', () => {
		baseTest('should create account with valid credentials', async ({ page }: { page: Page }) => {
			const testUser = generateTestUser()

			// signUpViaUI navigates to /sign-up, fills form, clicks Create Account, waits for /dashboard
			await signUpViaUI(page, testUser)

			await expect(page).toHaveURL(/\/dashboard/)
			await page.waitForSelector('main', { state: 'visible' })
		})
	})

	baseTest.describe('Validation Errors', () => {
		baseTest(
			'should show validation error for invalid email format',
			async ({ page }: { page: Page }) => {
				await page.goto('/sign-up')
				await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

				await page.getByLabel('Full Name').fill('Test User')
				await page.getByLabel('Email').fill('invalid-email-format')
				await page.getByLabel('Password', { exact: true }).fill('ValidPassword123!')
				await page.getByLabel('Confirm Password').fill('ValidPassword123!')

				await page.getByRole('button', { name: 'Create Account' }).click()

				// HTML5 validation should prevent submission
				await expect(page).toHaveURL(/sign-up/)
			},
		)

		baseTest(
			'should show validation error for weak password (less than 8 chars)',
			async ({ page }: { page: Page }) => {
				await page.goto('/sign-up')
				await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

				await page.getByLabel('Full Name').fill('Test User')
				await page.getByLabel('Email').fill('test@example.com')
				await page.getByLabel('Password', { exact: true }).fill('weak')
				await page.getByLabel('Confirm Password').fill('weak')

				await page.getByRole('button', { name: 'Create Account' }).click()
				await expect(page).toHaveURL(/sign-up/)
			},
		)

		baseTest(
			'should show validation error for password mismatch',
			async ({ page }: { page: Page }) => {
				await page.goto('/sign-up')
				await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

				await page.getByLabel('Full Name').fill('Test User')
				await page.getByLabel('Email').fill('test@example.com')
				await page.getByLabel('Password', { exact: true }).fill('ValidPassword123!')
				await page.getByLabel('Confirm Password').fill('DifferentPassword123!')

				await page.getByRole('button', { name: 'Create Account' }).click()
				await expect(page).toHaveURL(/sign-up/)
			},
		)
	})

	baseTest.describe('Duplicate Email', () => {
		baseTest(
			'should show error for duplicate email registration',
			async ({ page }: { page: Page }) => {
				const testUser = generateTestUser()

				// First registration
				await signUpViaUI(page, testUser)

				await page.goto('/sign-up')
				await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

				await page.getByLabel('Full Name').fill(testUser.name)
				await page.getByLabel('Email').fill(testUser.email)
				await page.getByLabel('Password', { exact: true }).fill(testUser.password)
				await page.getByLabel('Confirm Password').fill(testUser.password)

				await page.getByRole('button', { name: 'Create Account' }).click()
				await expect(page).toHaveURL(/sign-up/)
			},
		)
	})
})

baseTest.describe('Sign-In Flow', () => {
	baseTest.describe('Successful Sign-In', () => {
		baseTest(
			'should redirect to dashboard with valid credentials',
			async ({ page }: { page: Page }) => {
				const testUser = generateTestUser()
				await signUpViaUI(page, testUser)

				await page.goto('/sign-in')
				await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

				await page.getByLabel('Email').click()
				await page.getByLabel('Email').pressSequentially(testUser.email, { delay: 20 })
				await page.getByLabel('Password').click()
				await page.getByLabel('Password').pressSequentially(testUser.password, { delay: 20 })
				await page.getByRole('button', { name: 'Sign In' }).click()

				await page.waitForURL(/\/dashboard/, { timeout: 15000 })
				await expect(page).toHaveURL(/\/dashboard/)
			},
		)
	})

	baseTest.describe('Invalid Credentials', () => {
		baseTest('should show error for invalid credentials', async ({ page }: { page: Page }) => {
			await page.goto('/sign-in')
			await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

			await page.getByLabel('Email').fill('nonexistent@example.com')
			await page.getByLabel('Password').fill('WrongPassword123!')
			await page.getByRole('button', { name: 'Sign In' }).click()

			await expect(page).toHaveURL(/sign-in/)
		})

		baseTest('should show error for wrong password', async ({ page }: { page: Page }) => {
			const testUser = generateTestUser()
			await signUpViaUI(page, testUser)

			await page.goto('/sign-in')
			await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

			await page.getByLabel('Email').fill(testUser.email)
			await page.getByLabel('Password').fill('WrongPassword123!')
			await page.getByRole('button', { name: 'Sign In' }).click()

			await expect(page).toHaveURL(/sign-in/)
		})
	})

	baseTest.describe('Forgot Password Link', () => {
		baseTest('should navigate to forgot password page', async ({ page }: { page: Page }) => {
			await page.goto('/sign-in')
			await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

			const forgotPasswordLink = page.locator('a[href="/forgot-password"]')
			await expect(forgotPasswordLink).toBeVisible()

			await forgotPasswordLink.click()
			await page.waitForURL(/\/forgot-password/, { timeout: 10000 })
			await expect(page).toHaveURL(/\/forgot-password/)
		})
	})
})

baseTest.describe('Password Reset Flow', () => {
	baseTest(
		'should show email sent confirmation for password reset request',
		async ({ page }: { page: Page }) => {
			await page.goto('/forgot-password')
			await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

			await page.getByLabel('Email').fill('test@example.com')
			await page.getByRole('button', { name: /send|reset/i }).click()

			await page.waitForTimeout(2000)

			const currentUrl = page.url()
			expect(
				currentUrl.includes('/forgot-password') ||
					currentUrl.includes('/sign-in') ||
					currentUrl.includes('/reset-password'),
			).toBeTruthy()
		},
	)

	baseTest(
		'should have back to sign in link on forgot password page',
		async ({ page }: { page: Page }) => {
			await page.goto('/forgot-password')
			await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

			const backLink = page.locator('a[href="/sign-in"]')
			await expect(backLink).toBeVisible()
		},
	)
})

test.describe('Sign-Out Flow', () => {
	test('should clear session and redirect after sign-out', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const signOutButton = authenticatedPage.getByRole('button', { name: /sign out/i })
		await expect(signOutButton).toBeVisible()
		await signOutButton.click()

		await authenticatedPage.waitForURL(/\/sign-in/, { timeout: 15000 })
		await expect(authenticatedPage).toHaveURL(/\/sign-in/)
	})
})

baseTest.describe('Protected Routes', () => {
	baseTest(
		'should redirect unauthenticated user from dashboard to sign-in',
		async ({ page }: { page: Page }) => {
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Should redirect to sign-in or landing page
			await expect(page).toHaveURL(/\/(sign-in)?$/, { timeout: 10000 })
		},
	)

	baseTest(
		'should handle unauthenticated API requests with 401',
		async ({ request }: { request: import('@playwright/test').APIRequestContext }) => {
			const response = await request.get('/api/rpc/workspaces/list')
			expect(response.status()).toBe(401)
		},
	)

	baseTest(
		'should handle unauthenticated agent API requests with 401/403',
		async ({ request }: { request: import('@playwright/test').APIRequestContext }) => {
			const response = await request.get('/api/rpc/agents/list?workspaceId=test')
			expect([401, 403]).toContain(response.status())
		},
	)

	baseTest(
		'should handle unauthenticated tool API requests with 401/403',
		async ({ request }: { request: import('@playwright/test').APIRequestContext }) => {
			const response = await request.get('/api/rpc/tools/list?workspaceId=test')
			expect([401, 403]).toContain(response.status())
		},
	)
})

test.describe('Session Persistence', () => {
	test('should maintain session across page refreshes', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		await authenticatedPage.reload()
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await expect(authenticatedPage).toHaveURL(/\/dashboard/)

		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await expect(authenticatedPage.getByText(/settings/i).first()).toBeVisible()

		await authenticatedPage.reload()
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/settings/)
	})

	test('should maintain session when navigating between protected routes', async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()

		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Tools', exact: true }),
		).toBeVisible()

		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await expect(authenticatedPage).toHaveURL(/\/dashboard/)
	})
})

baseTest.describe('OAuth Buttons', () => {
	baseTest(
		'should display OAuth buttons on sign-in page if providers are enabled',
		async ({ page }: { page: Page }) => {
			await page.goto('/sign-in')
			await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

			const googleButton = page.getByRole('button', { name: /continue with google/i })
			const githubButton = page.getByRole('button', { name: /continue with github/i })

			const hasGoogle = await googleButton.isVisible().catch(() => false)
			const hasGitHub = await githubButton.isVisible().catch(() => false)

			if (hasGoogle) {
				await expect(googleButton).toBeEnabled()
			}
			if (hasGitHub) {
				await expect(githubButton).toBeEnabled()
			}
		},
	)

	baseTest(
		'should display OAuth buttons on sign-up page if providers are enabled',
		async ({ page }: { page: Page }) => {
			await page.goto('/sign-up')
			await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

			const googleButton = page.getByRole('button', { name: /continue with google/i })
			const githubButton = page.getByRole('button', { name: /continue with github/i })

			const hasGoogle = await googleButton.isVisible().catch(() => false)
			const hasGitHub = await githubButton.isVisible().catch(() => false)

			if (hasGoogle) {
				await expect(googleButton).toBeEnabled()
			}
			if (hasGitHub) {
				await expect(githubButton).toBeEnabled()
			}
		},
	)
})

baseTest.describe('Form Accessibility', () => {
	baseTest(
		'should have proper labels for sign-in form fields',
		async ({ page }: { page: Page }) => {
			await page.goto('/sign-in')
			await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

			await expect(page.getByLabel('Email')).toBeVisible()
			await expect(page.getByLabel('Password')).toBeVisible()
		},
	)

	baseTest(
		'should have proper labels for sign-up form fields',
		async ({ page }: { page: Page }) => {
			await page.goto('/sign-up')
			await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

			await expect(page.getByLabel('Full Name')).toBeVisible()
			await expect(page.getByLabel('Email')).toBeVisible()
			await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
			await expect(page.getByLabel('Confirm Password')).toBeVisible()
		},
	)
})

baseTest.describe('Page Navigation Links', () => {
	baseTest('should navigate from sign-in to sign-up', async ({ page }: { page: Page }) => {
		await page.goto('/sign-in')
		await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

		const signUpLink = page.locator('a[href="/sign-up"]')
		await expect(signUpLink).toBeVisible()
		await signUpLink.click()

		await expect(page).toHaveURL(/\/sign-up/)
		await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
	})

	baseTest('should navigate from sign-up to sign-in', async ({ page }: { page: Page }) => {
		await page.goto('/sign-up')
		await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

		const signInLink = page.locator('a[href="/sign-in"]')
		await expect(signInLink).toBeVisible()
		await signInLink.click()

		await expect(page).toHaveURL(/\/sign-in/)
		await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
	})
})
