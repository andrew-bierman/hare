import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/embed')({
	component: EmbedLayout,
})

/**
 * Minimal layout for embedded widget - no providers, navigation, or extra UI
 * This keeps the widget lightweight and isolated
 */
function EmbedLayout() {
	return (
		<div className="font-sans antialiased">
			<Outlet />
		</div>
	)
}
