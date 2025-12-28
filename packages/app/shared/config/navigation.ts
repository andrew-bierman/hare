/**
 * Navigation Configuration
 */

import { APP_CONFIG } from './app'

// =============================================================================
// Navigation
// =============================================================================

export const NAV_ITEMS = {
	main: [
		{ label: 'Features', href: '#features' },
		{ label: 'How it Works', href: '#how-it-works' },
		{ label: 'GitHub', href: APP_CONFIG.repository, external: true },
		{ label: 'Docs', href: APP_CONFIG.docs },
	],
	dashboard: [
		{ label: 'Dashboard', href: '/dashboard', icon: 'Home' },
		{ label: 'Agents', href: '/dashboard/agents', icon: 'Bot' },
		{ label: 'Tools', href: '/dashboard/tools', icon: 'Wrench' },
		{ label: 'Analytics', href: '/dashboard/analytics', icon: 'BarChart3' },
		{ label: 'Usage', href: '/dashboard/usage', icon: 'Activity' },
		{ label: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
	],
	footer: [
		{ label: 'Documentation', href: APP_CONFIG.docs },
		{ label: 'GitHub', href: APP_CONFIG.repository },
		{ label: 'Privacy', href: '/privacy' },
		{ label: 'Terms', href: '/terms' },
	],
} as const

export type NavItems = typeof NAV_ITEMS
