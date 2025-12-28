'use client'

import { useNavigate } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { signOut } from 'web-app/lib/auth-client'

export function SignOutButton() {
	const navigate = useNavigate()
	const [isSigningOut, setIsSigningOut] = useState(false)

	const handleSignOut = async () => {
		setIsSigningOut(true)
		try {
			await signOut()
			toast.success('Signed out successfully')
			navigate({ to: '/sign-in' })
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
