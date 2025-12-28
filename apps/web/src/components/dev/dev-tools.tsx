import { DEV_CONFIG, DEV_TOOLS_CONTENT, FEATURES } from '@hare/app/shared/config'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
	Bot,
	ChevronDown,
	ChevronUp,
	Copy,
	LogIn,
	LogOut,
	Plus,
	Rabbit,
	RefreshCw,
	Trash2,
	UserPlus,
	X,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { useCreateAgent, useCreateWorkspace } from 'web-app/lib/api/hooks'
import { authClient } from 'web-app/lib/auth-client'

const { sections, agentNames, agentDescriptions, defaultInstructions } = DEV_TOOLS_CONTENT

export function DevTools() {
	const [isOpen, setIsOpen] = useState(false)
	const [isMinimized, setIsMinimized] = useState(false)
	const [isSigningUp, setIsSigningUp] = useState(false)
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	const { activeWorkspace } = useWorkspace()
	const createAgent = useCreateAgent(activeWorkspace?.id)
	const createWorkspace = useCreateWorkspace()

	// Only render in dev mode
	if (!FEATURES.devMode) {
		return null
	}

	const randomName = () => agentNames[Math.floor(Math.random() * agentNames.length)]
	const randomDesc = () => agentDescriptions[Math.floor(Math.random() * agentDescriptions.length)]

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
		} catch (_error) {
			toast.error('Sign out failed')
		}
	}

	const handleQuickSignUp = async () => {
		setIsSigningUp(true)
		const timestamp = Date.now()
		try {
			const result = await authClient.signUp.email({
				email: `test${timestamp}@example.com`,
				password: 'password123',
				name: `Test User ${timestamp}`,
			})
			if (result.error) {
				toast.error(`Sign up failed: ${result.error.message}`)
			} else {
				toast.success(`Created & signed in as test${timestamp}@example.com`)
				queryClient.invalidateQueries()
				navigate({ to: '/dashboard' })
			}
		} catch (error) {
			toast.error(`Sign up failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
		} finally {
			setIsSigningUp(false)
		}
	}

	const handleCreateAgent = async () => {
		if (!activeWorkspace) {
			toast.error('No workspace selected')
			return
		}
		try {
			const agent = await createAgent.mutateAsync({
				name: randomName()!,
				description: randomDesc(),
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				instructions: defaultInstructions,
			})
			toast.success(`Created agent: ${agent.name}`)
			navigate({ to: '/dashboard/agents/$id', params: { id: agent.id } })
		} catch (_error) {
			toast.error('Failed to create agent')
		}
	}

	const handleCreateWorkspace = async () => {
		const timestamp = Date.now()
		try {
			const workspace = await createWorkspace.mutateAsync({
				name: `Workspace ${timestamp}`,
				slug: `workspace-${timestamp}`,
			})
			toast.success(`Created workspace: ${workspace.name}`)
		} catch (_error) {
			toast.error('Failed to create workspace')
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
				className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-orange-600"
				onClick={() => setIsOpen(true)}
			>
				<Rabbit className="h-6 w-6" />
			</Button>
		)
	}

	return (
		<Card className="fixed bottom-4 right-4 z-50 w-80 shadow-xl border-orange-500/50 bg-background/95 backdrop-blur">
			<CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
				<div className="flex items-center gap-2">
					<Rabbit className="h-4 w-4 text-orange-500" />
					<CardTitle className="text-sm font-medium">{DEV_TOOLS_CONTENT.title}</CardTitle>
					<Badge
						variant="outline"
						className="text-[10px] px-1.5 py-0 text-orange-600 border-orange-500/50 bg-orange-500/10"
					>
						{DEV_TOOLS_CONTENT.badge}
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
						<p className="text-xs font-medium text-muted-foreground">{sections.auth.title}</p>
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs"
								onClick={handleQuickSignIn}
							>
								<LogIn className="h-3 w-3 mr-1.5" />
								{sections.auth.signIn}
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs"
								onClick={handleQuickSignUp}
								disabled={isSigningUp}
							>
								<UserPlus className="h-3 w-3 mr-1.5" />
								{isSigningUp ? '...' : sections.auth.signUp}
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs col-span-2"
								onClick={handleSignOut}
							>
								<LogOut className="h-3 w-3 mr-1.5" />
								{sections.auth.signOut}
							</Button>
						</div>
					</div>

					{/* Quick Create */}
					<div className="space-y-2">
						<p className="text-xs font-medium text-muted-foreground">
							{sections.quickCreate.title}
						</p>
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs border-orange-500/50 text-orange-600 hover:text-orange-600 hover:bg-orange-500/10"
								onClick={handleCreateAgent}
								disabled={createAgent.isPending || !activeWorkspace}
							>
								<Bot className="h-3 w-3 mr-1.5" />
								{createAgent.isPending ? '...' : sections.quickCreate.agent}
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs border-blue-500/50 text-blue-600 hover:text-blue-600 hover:bg-blue-500/10"
								onClick={handleCreateWorkspace}
								disabled={createWorkspace.isPending}
							>
								<Plus className="h-3 w-3 mr-1.5" />
								{createWorkspace.isPending ? '...' : sections.quickCreate.workspace}
							</Button>
						</div>
					</div>

					{/* Cache Actions */}
					<div className="space-y-2">
						<p className="text-xs font-medium text-muted-foreground">{sections.cache.title}</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								className="flex-1 h-8 text-xs"
								onClick={handleRefreshAll}
							>
								<RefreshCw className="h-3 w-3 mr-1.5" />
								{sections.cache.refresh}
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="flex-1 h-8 text-xs text-destructive hover:text-destructive"
								onClick={handleClearCache}
							>
								<Trash2 className="h-3 w-3 mr-1.5" />
								{sections.cache.clear}
							</Button>
							<Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleCopySession}>
								<Copy className="h-3 w-3" />
							</Button>
						</div>
					</div>

					{/* Info */}
					<div className="pt-2 border-t text-[10px] text-muted-foreground space-y-0.5">
						<p>Test: {DEV_CONFIG.testUser.email} / password123</p>
						{activeWorkspace && <p>Workspace: {activeWorkspace.name}</p>}
					</div>
				</CardContent>
			)}
		</Card>
	)
}
