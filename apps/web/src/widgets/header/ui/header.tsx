'use client'

import { Header as BaseHeader } from '@hare/app/widgets'
import { Link } from '@tanstack/react-router'
import { UserNav } from './user-nav'

/**
 * Web-specific Header that wires up TanStack Router Link and UserNav.
 */
export function Header() {
	return (
		<BaseHeader
			Link={({ to, className, children }) => (
				<Link to={to} className={className}>
					{children}
				</Link>
			)}
			UserNav={UserNav}
		/>
	)
}
