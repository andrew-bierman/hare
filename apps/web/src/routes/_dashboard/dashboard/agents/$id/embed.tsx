import { createFileRoute, Link } from '@tanstack/react-router'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@workspace/ui/components/select'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Switch } from '@workspace/ui/components/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'
import {
	AlertTriangle,
	ArrowLeft,
	Check,
	Code,
	Copy,
	ExternalLink,
	Eye,
	Palette,
	Settings2,
	Shield,
} from 'lucide-react'
import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { useAgent, useUpdateAgent } from 'web-app/lib/api/hooks'

export const Route = createFileRoute('/_dashboard/dashboard/agents/$id/embed')({
	component: EmbedConfigPage,
})

// Color presets
const COLOR_PRESETS = [
	{ name: 'Indigo', value: '#6366f1' },
	{ name: 'Blue', value: '#3b82f6' },
	{ name: 'Emerald', value: '#10b981' },
	{ name: 'Rose', value: '#f43f5e' },
	{ name: 'Amber', value: '#f59e0b' },
	{ name: 'Purple', value: '#a855f7' },
	{ name: 'Slate', value: '#475569' },
	{ name: 'Black', value: '#18181b' },
]

// Position options
const POSITIONS = [
	{ label: 'Bottom Right', value: 'bottom-right' },
	{ label: 'Bottom Left', value: 'bottom-left' },
	{ label: 'Top Right', value: 'top-right' },
	{ label: 'Top Left', value: 'top-left' },
]

interface EmbedConfig {
	enabled: boolean
	theme: 'light' | 'dark'
	position: string
	primaryColor: string
	initialMessage: string
	allowedDomains: string[]
}

function LoadingSkeleton() {
	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center gap-4">
				<Skeleton className="h-9 w-9 rounded-lg" />
				<div className="space-y-2">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-5 w-96" />
				</div>
			</div>
			<div className="grid gap-6 lg:grid-cols-2 mt-6">
				<Skeleton className="h-96" />
				<Skeleton className="h-96" />
			</div>
		</div>
	)
}

function EmbedConfigPage() {
	const { id: agentId } = Route.useParams()
	const { activeWorkspace } = useWorkspace()
	const { data: agent, isLoading, error } = useAgent(agentId, activeWorkspace?.id)
	const updateAgent = useUpdateAgent(activeWorkspace?.id)

	// Embed configuration state
	const [config, setConfig] = useState<EmbedConfig>({
		enabled: true,
		theme: 'light',
		position: 'bottom-right',
		primaryColor: '#6366f1',
		initialMessage: '',
		allowedDomains: [],
	})
	const [domainsInput, setDomainsInput] = useState('')
	const [copied, setCopied] = useState(false)
	const [hasChanges, setHasChanges] = useState(false)

	// Load existing config
	useEffect(() => {
		if (agent?.config) {
			const agentConfig = agent.config as Record<string, unknown>
			const embedConfig = agentConfig.embed as EmbedConfig | undefined
			if (embedConfig) {
				setConfig({
					enabled: embedConfig.enabled ?? true,
					theme: embedConfig.theme ?? 'light',
					position: embedConfig.position ?? 'bottom-right',
					primaryColor: embedConfig.primaryColor ?? '#6366f1',
					initialMessage: embedConfig.initialMessage ?? '',
					allowedDomains: embedConfig.allowedDomains ?? [],
				})
				setDomainsInput((embedConfig.allowedDomains ?? []).join('\n'))
			}
		}
	}, [agent])

	// Track changes
	useEffect(() => {
		if (agent?.config) {
			const agentConfig = agent.config as Record<string, unknown>
			const existingEmbed = agentConfig.embed as EmbedConfig | undefined
			const currentDomains = domainsInput
				.split('\n')
				.map((d) => d.trim())
				.filter(Boolean)

			const isChanged =
				config.enabled !== (existingEmbed?.enabled ?? true) ||
				config.theme !== (existingEmbed?.theme ?? 'light') ||
				config.position !== (existingEmbed?.position ?? 'bottom-right') ||
				config.primaryColor !== (existingEmbed?.primaryColor ?? '#6366f1') ||
				config.initialMessage !== (existingEmbed?.initialMessage ?? '') ||
				JSON.stringify(currentDomains.sort()) !==
					JSON.stringify((existingEmbed?.allowedDomains ?? []).sort())

			setHasChanges(isChanged)
		}
	}, [agent, config, domainsInput])

	// Generate embed code
	const embedCode = useMemo(() => {
		const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
		const attrs = [
			`src="${baseUrl}/widget.js"`,
			`data-agent-id="${agentId}"`,
			`data-theme="${config.theme}"`,
			`data-position="${config.position}"`,
			`data-primary-color="${config.primaryColor}"`,
		]
		if (config.initialMessage) {
			attrs.push(`data-initial-message="${config.initialMessage}"`)
		}
		return `<script ${attrs.join(' ')}></script>`
	}, [agentId, config])

	// Preview URL
	const previewUrl = useMemo(() => {
		const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
		const params = new URLSearchParams({
			theme: config.theme,
			primaryColor: config.primaryColor,
		})
		if (config.initialMessage) {
			params.set('initialMessage', config.initialMessage)
		}
		return `${baseUrl}/embed/${agentId}?${params.toString()}`
	}, [agentId, config])

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(embedCode)
			setCopied(true)
			toast.success('Embed code copied to clipboard')
			setTimeout(() => setCopied(false), 2000)
		} catch {
			toast.error('Failed to copy to clipboard')
		}
	}

	const handleSave = async () => {
		try {
			const domains = domainsInput
				.split('\n')
				.map((d) => d.trim())
				.filter(Boolean)

			const agentConfig = (agent?.config || {}) as Record<string, unknown>
			const newConfig = {
				...agentConfig,
				embed: {
					...config,
					allowedDomains: domains,
				},
				// Also set allowedDomains at the root level for the API check
				allowedDomains: domains,
			}

			await updateAgent.mutateAsync({
				id: agentId,
				data: {
					config: newConfig as {
						temperature?: number
						maxTokens?: number
						topP?: number
						topK?: number
						stopSequences?: string[]
					},
				},
			})
			toast.success('Embed settings saved')
			setHasChanges(false)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save settings')
		}
	}

	const handleTestWidget = () => {
		window.open(previewUrl, '_blank', 'width=420,height=600')
	}

	if (isLoading) {
		return <LoadingSkeleton />
	}

	if (error || !agent) {
		return (
			<div className="flex-1 p-8 pt-6">
				<Card className="p-6 text-center">
					<p className="text-destructive">{error?.message || 'Agent not found'}</p>
					<Link to="/dashboard/agents">
						<Button className="mt-4">Back to Agents</Button>
					</Link>
				</Card>
			</div>
		)
	}

	const isDeployed = agent.status === 'deployed'

	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to={`/dashboard/agents/${agentId}`}>
						<Button variant="ghost" size="icon" className="h-9 w-9">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<h2 className="text-2xl font-bold tracking-tight">Embed Widget</h2>
						<p className="text-muted-foreground">
							Configure and embed the chat widget on your website
						</p>
					</div>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={handleTestWidget} disabled={!isDeployed}>
						<Eye className="mr-2 h-4 w-4" />
						Test Widget
					</Button>
					<Button onClick={handleSave} disabled={updateAgent.isPending || !hasChanges}>
						{updateAgent.isPending ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</div>

			{/* Deployment warning */}
			{!isDeployed && (
				<Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
					<CardContent className="flex items-center gap-3 py-4">
						<AlertTriangle className="h-5 w-5 text-amber-600" />
						<div>
							<p className="font-medium text-amber-800 dark:text-amber-200">Agent Not Deployed</p>
							<p className="text-sm text-amber-700 dark:text-amber-300">
								Deploy your agent before embedding the widget on your website.
							</p>
						</div>
						<Link to={`/dashboard/agents/${agentId}`} className="ml-auto">
							<Button size="sm" variant="outline">
								Go to Settings
							</Button>
						</Link>
					</CardContent>
				</Card>
			)}

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Configuration */}
				<div className="space-y-6">
					<Tabs defaultValue="appearance" className="space-y-4">
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="appearance" className="flex items-center gap-2">
								<Palette className="h-4 w-4" />
								Appearance
							</TabsTrigger>
							<TabsTrigger value="behavior" className="flex items-center gap-2">
								<Settings2 className="h-4 w-4" />
								Behavior
							</TabsTrigger>
							<TabsTrigger value="security" className="flex items-center gap-2">
								<Shield className="h-4 w-4" />
								Security
							</TabsTrigger>
						</TabsList>

						<TabsContent value="appearance" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Theme & Colors</CardTitle>
									<CardDescription>Customize the widget appearance</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									{/* Theme */}
									<div className="space-y-2">
										<Label>Theme</Label>
										<Select
											value={config.theme}
											onValueChange={(value: 'light' | 'dark') =>
												setConfig((c) => ({ ...c, theme: value }))
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="light">Light</SelectItem>
												<SelectItem value="dark">Dark</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{/* Position */}
									<div className="space-y-2">
										<Label>Position</Label>
										<Select
											value={config.position}
											onValueChange={(value) => setConfig((c) => ({ ...c, position: value }))}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{POSITIONS.map((pos) => (
													<SelectItem key={pos.value} value={pos.value}>
														{pos.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{/* Primary Color */}
									<div className="space-y-3">
										<Label>Primary Color</Label>
										<div className="flex flex-wrap gap-2">
											{COLOR_PRESETS.map((color) => (
												<button
													key={color.value}
													type="button"
													onClick={() => setConfig((c) => ({ ...c, primaryColor: color.value }))}
													className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${
														config.primaryColor === color.value
															? 'border-foreground ring-2 ring-offset-2'
															: 'border-transparent'
													}`}
													style={{ backgroundColor: color.value }}
													title={color.name}
												/>
											))}
										</div>
										<div className="flex items-center gap-2">
											<Input
												type="color"
												value={config.primaryColor}
												onChange={(e: ChangeEvent<HTMLInputElement>) =>
													setConfig((c) => ({ ...c, primaryColor: e.target.value }))
												}
												className="h-10 w-14 cursor-pointer p-1"
											/>
											<Input
												value={config.primaryColor}
												onChange={(e: ChangeEvent<HTMLInputElement>) =>
													setConfig((c) => ({ ...c, primaryColor: e.target.value }))
												}
												placeholder="#6366f1"
												className="flex-1"
											/>
										</div>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="behavior" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Widget Behavior</CardTitle>
									<CardDescription>Configure how the widget behaves</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									{/* Enable/Disable */}
									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<Label>Enable Widget</Label>
											<p className="text-sm text-muted-foreground">
												Allow the widget to be embedded on websites
											</p>
										</div>
										<Switch
											checked={config.enabled}
											onCheckedChange={(checked) => setConfig((c) => ({ ...c, enabled: checked }))}
										/>
									</div>

									{/* Initial Message */}
									<div className="space-y-2">
										<Label htmlFor="initial-message">Welcome Message</Label>
										<Textarea
											id="initial-message"
											value={config.initialMessage}
											onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
												setConfig((c) => ({ ...c, initialMessage: e.target.value }))
											}
											placeholder="Hello! How can I help you today?"
											className="h-24"
										/>
										<p className="text-xs text-muted-foreground">
											This message will be shown when the chat opens
										</p>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="security" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Domain Restrictions</CardTitle>
									<CardDescription>Control which domains can embed the widget</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="allowed-domains">Allowed Domains</Label>
										<Textarea
											id="allowed-domains"
											value={domainsInput}
											onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
												setDomainsInput(e.target.value)
											}
											placeholder="example.com&#10;*.example.com&#10;app.mydomain.com"
											className="h-32 font-mono text-sm"
										/>
										<p className="text-xs text-muted-foreground">
											One domain per line. Use * for wildcard subdomains. Leave empty to allow all
											domains.
										</p>
									</div>
									{domainsInput.trim() && (
										<div className="space-y-2">
											<Label>Configured Domains</Label>
											<div className="flex flex-wrap gap-2">
												{domainsInput
													.split('\n')
													.map((d) => d.trim())
													.filter(Boolean)
													.map((domain) => (
														<Badge key={domain} variant="secondary">
															{domain}
														</Badge>
													))}
											</div>
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>

				{/* Preview & Embed Code */}
				<div className="space-y-6">
					{/* Preview */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Eye className="h-4 w-4" />
								Preview
							</CardTitle>
							<CardDescription>See how the widget will look on your website</CardDescription>
						</CardHeader>
						<CardContent>
							<div
								className="relative h-[400px] rounded-lg border overflow-hidden"
								style={{
									backgroundColor: config.theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
								}}
							>
								<iframe
									src={previewUrl}
									title="Widget Preview"
									className="w-full h-full border-0"
									sandbox="allow-scripts allow-same-origin"
								/>
							</div>
							<div className="mt-3 flex justify-end">
								<Button variant="outline" size="sm" onClick={handleTestWidget}>
									<ExternalLink className="mr-2 h-3.5 w-3.5" />
									Open in New Window
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Embed Code */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Code className="h-4 w-4" />
								Embed Code
							</CardTitle>
							<CardDescription>
								Copy this code and paste it into your website's HTML
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="relative">
								<pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
									<code className="text-foreground">{embedCode}</code>
								</pre>
								<Button
									size="sm"
									variant="secondary"
									className="absolute right-2 top-2"
									onClick={handleCopy}
								>
									{copied ? (
										<>
											<Check className="mr-1.5 h-3.5 w-3.5" />
											Copied
										</>
									) : (
										<>
											<Copy className="mr-1.5 h-3.5 w-3.5" />
											Copy
										</>
									)}
								</Button>
							</div>
							<div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
								<h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
									Installation Instructions
								</h4>
								<ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-decimal list-inside">
									<li>Copy the embed code above</li>
									<li>
										Paste it before the closing{' '}
										<code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">
											{'</body>'}
										</code>{' '}
										tag
									</li>
									<li>The widget will appear automatically on your website</li>
								</ol>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
