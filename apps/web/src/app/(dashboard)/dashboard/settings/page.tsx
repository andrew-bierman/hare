'use client'

import { Bell, Key, LogOut, Shield, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from 'web-app/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from 'web-app/components/ui/card'
import { Input } from 'web-app/components/ui/input'
import { Label } from 'web-app/components/ui/label'
import { Separator } from 'web-app/components/ui/separator'
import { Skeleton } from 'web-app/components/ui/skeleton'
import { useAuth } from 'web-app/components/providers/auth-provider'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { signOut } from 'web-app/lib/auth-client'

export default function SettingsPage() {
	const router = useRouter()
	const { data: session, isPending: sessionLoading } = useAuth()
	const { activeWorkspace } = useWorkspace()

	const [name, setName] = useState('')
	const [isSigningOut, setIsSigningOut] = useState(false)

	// Initialize name from session
	useState(() => {
		if (session?.user?.name) {
			setName(session.user.name)
		}
	})

	const handleSignOut = async () => {
		setIsSigningOut(true)
		try {
			await signOut()
			toast.success('Signed out successfully')
			router.push('/sign-in')
		} catch (error) {
			toast.error('Failed to sign out')
		} finally {
			setIsSigningOut(false)
		}
	}

	if (sessionLoading) {
		return (
			<div className="flex-1 space-y-6 p-8 pt-6">
				<Skeleton className="h-9 w-32" />
				<div className="grid gap-6">
					<Skeleton className="h-64 w-full" />
					<Skeleton className="h-48 w-full" />
					<Skeleton className="h-48 w-full" />
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">Settings</h2>
			</div>

			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<User className="h-5 w-5 text-zinc-500" />
							<CardTitle>Profile</CardTitle>
						</div>
						<CardDescription>Manage your account information</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={name || session?.user?.name || ''}
								onChange={(e) => setName(e.target.value)}
								placeholder="Your name"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={session?.user?.email || ''}
								disabled
								className="bg-muted"
							/>
							<p className="text-xs text-muted-foreground">
								Email cannot be changed. Contact support if you need to update it.
							</p>
						</div>
						<Button disabled>Save Changes</Button>
						<p className="text-xs text-muted-foreground">
							Profile updates coming soon.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Key className="h-5 w-5 text-zinc-500" />
							<CardTitle>Workspace</CardTitle>
						</div>
						<CardDescription>Current workspace information</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{activeWorkspace ? (
							<div className="flex items-center justify-between p-4 border rounded-lg">
								<div>
									<p className="font-medium">{activeWorkspace.name}</p>
									<p className="text-sm text-muted-foreground">
										ID: {activeWorkspace.id}
									</p>
								</div>
								<div className="text-sm text-muted-foreground">
									Active
								</div>
							</div>
						) : (
							<p className="text-muted-foreground">No workspace selected</p>
						)}
						<p className="text-xs text-muted-foreground">
							Use the workspace switcher in the sidebar to change workspaces.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Bell className="h-5 w-5 text-zinc-500" />
							<CardTitle>Notifications</CardTitle>
						</div>
						<CardDescription>Configure how you receive notifications</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Email Notifications</p>
									<p className="text-sm text-muted-foreground">Receive updates via email</p>
								</div>
								<Button variant="outline" size="sm" disabled>
									Coming Soon
								</Button>
							</div>
							<Separator />
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Usage Alerts</p>
									<p className="text-sm text-muted-foreground">Get notified when approaching limits</p>
								</div>
								<Button variant="outline" size="sm" disabled>
									Coming Soon
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Shield className="h-5 w-5 text-zinc-500" />
							<CardTitle>Security</CardTitle>
						</div>
						<CardDescription>Manage your security preferences</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Password</p>
								<p className="text-sm text-muted-foreground">Change your password</p>
							</div>
							<Button variant="outline" size="sm" disabled>
								Coming Soon
							</Button>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Two-Factor Authentication</p>
								<p className="text-sm text-muted-foreground">Add an extra layer of security</p>
							</div>
							<Button variant="outline" size="sm" disabled>
								Coming Soon
							</Button>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Sign Out</p>
								<p className="text-sm text-muted-foreground">Sign out of your account</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={handleSignOut}
								disabled={isSigningOut}
							>
								<LogOut className="mr-2 h-4 w-4" />
								{isSigningOut ? 'Signing out...' : 'Sign Out'}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
