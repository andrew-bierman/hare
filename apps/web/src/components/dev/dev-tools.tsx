'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Bug, ChevronDown, ChevronUp, Copy, Database, LogIn, RefreshCw, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { DEV_CONFIG, FEATURES } from 'web-app/config'
import { authClient } from 'web-app/lib/auth-client'

/**
 * Developer tools panel - only shown in development mode
 * Provides quick actions for testing and debugging
 */
export function DevTools() {
	const [isOpen, setIsOpen] = useState(false)
	const [isMinimized, setIsMinimized] = useState(false)
	const [isSeeding, setIsSeeding] = useState(false)
	const queryClient = useQueryClient()
	const router = useRouter()

	// Only render in dev mode
	if (!FEATURES.devMode) {
		return null
	}

	const handleQuickSignIn = async () => {
		try {
			const result = await authClient.signIn.email({
				email: DEV_CONFIG.testUser.email,
				password: DEV_CONFIG.testUser.password,
			})
			if (result.error) {
				toast.error(`Sign in failed: ${result.error.message}`)
			} else {
				toast.success('Signed in as test user')
				queryClient.invalidateQueries()
				router.refresh()
			}
		} catch (error) {
			toast.error(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	const handleSignOut = async () => {
		try {
			await authClient.signOut()
			toast.success('Signed out')
			queryClient.invalidateQueries()
			router.refresh()
		} catch (_error) {
			toast.error('Sign out failed')
		}
	}

	const handleSeedData = async () => {
		setIsSeeding(true)
		try {
			const response = await fetch('/api/dev/seed', { method: 'POST' })
			if (!response.ok) {
				throw new Error('Failed to seed data')
			}
			toast.success('Sample data loaded!')
			queryClient.invalidateQueries()
		} catch (_error) {
			toast.error('Failed to seed data')
		} finally {
			setIsSeeding(false)
		}
	}

	const handleClearCache = () => {
		queryClient.clear()
		toast.success('Query cache cleared')
	}

	const handleRefreshAll = () => {
		queryClient.invalidateQueries()
		toast.success('All queries refreshed')
	}

	const handleCopySession = async () => {
		const session = await authClient.getSession()
		if (session.data) {
			navigator.clipboard.writeText(JSON.stringify(session.data, null, 2))
			toast.success('Session copied to clipboard')
		} else {
			toast.error('No active session')
		}
	}

	if (!isOpen) {
		return (
			<Button
				variant="outline"
				size="icon"
				className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full shadow-lg bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-600"
				onClick={() => setIsOpen(true)}
			>
				<Bug className="h-5 w-5" />
			</Button>
		)
	}

	return (
		<Card className="fixed bottom-4 right-4 z-50 w-80 shadow-xl border-yellow-500/50 bg-background/95 backdrop-blur">
			<CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
				<div className="flex items-center gap-2">
					<Bug className="h-4 w-4 text-yellow-500" />
					<CardTitle className="text-sm font-medium">Dev Tools</CardTitle>
					<Badge
						variant="outline"
						className="text-[10px] px-1.5 py-0 text-yellow-600 border-yellow-500/50"
					>
						DEV
					</Badge>
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={() => setIsMinimized(!isMinimized)}
					>
						{isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
					</Button>
					<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
						<X className="h-3 w-3" />
					</Button>
				</div>
			</CardHeader>
			{!isMinimized && (
				<CardContent className="py-3 px-4 space-y-3">
					{/* Auth Actions */}
					<div className="space-y-2">
						<p className="text-xs font-medium text-muted-foreground">Authentication</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								className="flex-1 h-8 text-xs"
								onClick={handleQuickSignIn}
							>
								<LogIn className="h-3 w-3 mr-1.5" />
								Quick Sign In
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="flex-1 h-8 text-xs"
								onClick={handleSignOut}
							>
								Sign Out
							</Button>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="w-full h-8 text-xs justify-start"
							onClick={handleCopySession}
						>
							<Copy className="h-3 w-3 mr-1.5" />
							Copy Session to Clipboard
						</Button>
					</div>

					{/* Cache Actions */}
					<div className="space-y-2">
						<p className="text-xs font-medium text-muted-foreground">Cache & Data</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								className="flex-1 h-8 text-xs"
								onClick={handleRefreshAll}
							>
								<RefreshCw className="h-3 w-3 mr-1.5" />
								Refresh All
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="flex-1 h-8 text-xs text-destructive hover:text-destructive"
								onClick={handleClearCache}
							>
								<Trash2 className="h-3 w-3 mr-1.5" />
								Clear Cache
							</Button>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="w-full h-8 text-xs border-emerald-500/50 text-emerald-600 hover:text-emerald-600 hover:bg-emerald-500/10"
							onClick={handleSeedData}
							disabled={isSeeding}
						>
							<Database className="h-3 w-3 mr-1.5" />
							{isSeeding ? 'Loading...' : 'Load Sample Data'}
						</Button>
					</div>

					{/* Info */}
					<div className="pt-2 border-t">
						<p className="text-[10px] text-muted-foreground">
							Test user: {DEV_CONFIG.testUser.email}
						</p>
					</div>
				</CardContent>
			)}
		</Card>
	)
}
