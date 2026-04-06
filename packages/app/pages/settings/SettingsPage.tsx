'use client'

import { changePassword, updateUser } from '@hare/auth/client'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hare/ui/components/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@hare/ui/components/dialog'
import { Input } from '@hare/ui/components/input'
import { Label } from '@hare/ui/components/label'
import { Separator } from '@hare/ui/components/separator'
import { Skeleton } from '@hare/ui/components/skeleton'
import { Switch } from '@hare/ui/components/switch'
import { Bell, Key, Loader2, LogOut, Shield, User } from 'lucide-react'
import { type ChangeEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from '../../app/providers'
import { useAuth, useAuthActions } from '../../features/auth'
import { useUpdateUserPreferencesMutation, useUserPreferencesQuery } from '../../shared/api/hooks'

export function SettingsPage() {
	const { data: session, isPending: sessionLoading } = useAuth()
	const { signOut } = useAuthActions()
	const { activeWorkspace } = useWorkspace()

	// Profile state
	const [name, setName] = useState('')
	const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

	// Password change state
	const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
	const [currentPassword, setCurrentPassword] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [isChangingPassword, setIsChangingPassword] = useState(false)

	// Sign out state
	const [isSigningOut, setIsSigningOut] = useState(false)

	// User preferences
	const { data: preferences, isLoading: preferencesLoading } = useUserPreferencesQuery()
	const updatePreferencesMutation = useUpdateUserPreferencesMutation()

	// Initialize name from session
	useEffect(() => {
		if (session?.user?.name) {
			setName(session.user.name)
		}
	}, [session?.user?.name])

	const handleSaveProfile = async () => {
		if (!name.trim()) {
			toast.error('Name cannot be empty')
			return
		}

		setIsUpdatingProfile(true)
		try {
			await updateUser({ name: name.trim() })
			toast.success('Profile updated successfully')
		} catch (_error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update profile')
		} finally {
			setIsUpdatingProfile(false)
		}
	}

	const handleChangePassword = async () => {
		if (!currentPassword || !newPassword || !confirmPassword) {
			toast.error('Please fill in all fields')
			return
		}

		if (newPassword !== confirmPassword) {
			toast.error('New passwords do not match')
			return
		}

		if (newPassword.length < 8) {
			toast.error('Password must be at least 8 characters')
			return
		}

		setIsChangingPassword(true)
		try {
			await changePassword({
				currentPassword,
				newPassword,
				revokeOtherSessions: false,
			})
			toast.success('Password changed successfully')
			setPasswordDialogOpen(false)
			setCurrentPassword('')
			setNewPassword('')
			setConfirmPassword('')
		} catch (_error) {
			toast.error(error instanceof Error ? error.message : 'Failed to change password')
		} finally {
			setIsChangingPassword(false)
		}
	}

	const handleToggleEmailNotifications = async (checked: boolean) => {
		try {
			await updatePreferencesMutation.mutateAsync({ emailNotifications: checked })
			toast.success(checked ? 'Email notifications enabled' : 'Email notifications disabled')
		} catch (_error) {
			toast.error('Failed to update notification preference')
		}
	}

	const handleToggleUsageAlerts = async (checked: boolean) => {
		try {
			await updatePreferencesMutation.mutateAsync({ usageAlerts: checked })
			toast.success(checked ? 'Usage alerts enabled' : 'Usage alerts disabled')
		} catch (_error) {
			toast.error('Failed to update usage alerts preference')
		}
	}

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

	const hasProfileChanges = name !== (session?.user?.name || '')

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
								value={name}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
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
						<Button onClick={handleSaveProfile} disabled={!hasProfileChanges || isUpdatingProfile}>
							{isUpdatingProfile ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Saving...
								</>
							) : (
								'Save Changes'
							)}
						</Button>
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
									<p className="text-sm text-muted-foreground">ID: {activeWorkspace.id}</p>
								</div>
								<div className="text-sm text-muted-foreground">Active</div>
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
								{preferencesLoading ? (
									<Skeleton className="h-6 w-11" />
								) : (
									<Switch
										checked={preferences?.emailNotifications ?? true}
										onCheckedChange={handleToggleEmailNotifications}
										disabled={updatePreferencesMutation.isPending}
									/>
								)}
							</div>
							<Separator />
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Usage Alerts</p>
									<p className="text-sm text-muted-foreground">
										Get notified when approaching limits
									</p>
								</div>
								{preferencesLoading ? (
									<Skeleton className="h-6 w-11" />
								) : (
									<Switch
										checked={preferences?.usageAlerts ?? true}
										onCheckedChange={handleToggleUsageAlerts}
										disabled={updatePreferencesMutation.isPending}
									/>
								)}
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
							<Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
								<DialogTrigger asChild>
									<Button variant="outline" size="sm">
										Change Password
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Change Password</DialogTitle>
										<DialogDescription>
											Enter your current password and a new password to update your credentials.
										</DialogDescription>
									</DialogHeader>
									<div className="space-y-4 py-4">
										<div className="grid gap-2">
											<Label htmlFor="current-password">Current Password</Label>
											<Input
												id="current-password"
												type="password"
												value={currentPassword}
												onChange={(e) => setCurrentPassword(e.target.value)}
												placeholder="Enter current password"
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="new-password">New Password</Label>
											<Input
												id="new-password"
												type="password"
												value={newPassword}
												onChange={(e) => setNewPassword(e.target.value)}
												placeholder="Enter new password"
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="confirm-password">Confirm New Password</Label>
											<Input
												id="confirm-password"
												type="password"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												placeholder="Confirm new password"
											/>
										</div>
									</div>
									<DialogFooter>
										<Button
											variant="outline"
											onClick={() => setPasswordDialogOpen(false)}
											disabled={isChangingPassword}
										>
											Cancel
										</Button>
										<Button onClick={handleChangePassword} disabled={isChangingPassword}>
											{isChangingPassword ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Changing...
												</>
											) : (
												'Change Password'
											)}
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
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
							<Button variant="outline" size="sm" onClick={handleSignOut} disabled={isSigningOut}>
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
