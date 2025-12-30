import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

/**
 * Shared layout options for documentation pages
 */
export function getLayoutOptions(): BaseLayoutProps {
	return {
		nav: {
			title: 'Hare Docs',
		},
		links: [
			{
				text: 'Dashboard',
				url: '/dashboard',
			},
			{
				text: 'API Reference',
				url: '/docs/api',
			},
			{
				text: 'SDK Reference',
				url: '/docs/sdk',
			},
		],
	}
}
