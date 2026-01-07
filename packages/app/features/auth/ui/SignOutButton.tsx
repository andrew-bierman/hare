'use client'

import { Button } from '@hare/ui/components/button'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuthActions } from '../context'

export function SignOutButton() {
	const { signOut } = useAuthActions()
	const [isSigningOut, setIsSigningOut] = useState(false)

	const handleSignOut = async () => {
		setIsSigningOut(true)
		try {
			await signOut()
			toast.success('Signed out successfully')
			window.location.href = '/sign-in'
		} catch (_error) {
			toast.error('Failed to sign out')
		} finally {
			setIsSigningOut(false)
		}
	}

	return (
		<Button variant="outline" size="sm" onClick={handleSignOut} disabled={isSigningOut}>
			<LogOut className="mr-2 h-4 w-4" />
			{isSigningOut ? 'Signing out...' : 'Sign Out'}
		</Button>
	)
}
