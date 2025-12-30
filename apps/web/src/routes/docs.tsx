import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Parent layout for all /docs/* routes
 * Child routes (index, $) render inside the Outlet
 */
export const Route = createFileRoute('/docs')({
	component: DocsLayout,
})

function DocsLayout() {
	return <Outlet />
}
