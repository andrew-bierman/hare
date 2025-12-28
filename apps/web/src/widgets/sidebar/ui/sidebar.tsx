'use client'

import { Sidebar as BaseSidebar } from '@hare/app/widgets'
import { Link, useLocation } from '@tanstack/react-router'
import { WorkspaceSwitcher } from 'web-app/widgets/workspace-switcher'

/**
 * Web-specific Sidebar that wires up TanStack Router Link and WorkspaceSwitcher.
 */
export function Sidebar() {
	const location = useLocation()

	return (
		<BaseSidebar
			pathname={location.pathname}
			Link={({ to, className, children }) => (
				<Link to={to} className={className}>
					{children}
				</Link>
			)}
			WorkspaceSwitcher={WorkspaceSwitcher}
		/>
	)
}
