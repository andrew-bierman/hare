'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@hare/ui/components/avatar'
import { Button } from '@hare/ui/components/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@hare/ui/components/dropdown-menu'
import { LogOut, Settings } from 'lucide-react'
import { useAuth, useAuthActions } from '../../../features/auth'

export interface UserNavProps {
	Link: React.ComponentType<{ to: string; children: React.ReactNode; className?: string }>
	onSignOut?: () => void
}

/**
 * User navigation dropdown component.
 *
 * @param Link - Router Link component
 * @param onSignOut - Optional callback after sign out
 */
export function UserNav({ Link, onSignOut }: UserNavProps) {
	const { data: session, error, isPending } = useAuth()
	const { signOut } = useAuthActions()

	// If auth is pending, don't show login buttons (avoid flash)
	// If auth errored, treat as logged out
	const user = error ? null : session?.user
	const isLoading = isPending && !user

	const getInitials = (name?: string | null, email?: string | null) => {
		if (name) {
			return name
				.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		}
		if (email) {
			return email.slice(0, 2).toUpperCase()
		}
		return '?'
	}

	const handleSignOut = async () => {
		await signOut()
		onSignOut?.()
	}

	// While auth is loading, show nothing to avoid flash of login buttons
	if (isLoading) {
		return null
	}

	if (!user) {
		return (
			<div className="flex items-center gap-2">
				<Link to="/sign-in" className="hidden sm:block">
					<Button variant="ghost" size="sm">
						Sign In
					</Button>
				</Link>
				<Link to="/sign-up">
					<Button size="sm">Get Started</Button>
				</Link>
			</div>
		)
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="User menu">
					<Avatar className="h-10 w-10">
						<AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
						<AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
						<p className="text-xs leading-none text-muted-foreground">{user.email}</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link to="/dashboard/settings">
						<Settings className="mr-2 h-4 w-4" />
						<span>Settings</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSignOut}>
					<LogOut className="mr-2 h-4 w-4" />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
