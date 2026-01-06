'use client'

import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@hare/ui/components/card'
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
import { Skeleton } from '@hare/ui/components/skeleton'
import { Check, Copy, Key, Plus, Trash2 } from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from '../../app/providers'
import {
	type ApiKeyWithSecret,
	type ApiKey,
	useApiKeysQuery,
	useCreateApiKeyMutation,
	useDeleteApiKeyMutation,
} from '../../shared/api'

export function ApiKeysPage() {
	const { activeWorkspace } = useWorkspace()
	const workspaceId = activeWorkspace?.id

	const { data, isPending, error } = useApiKeysQuery()
	const createApiKey = useCreateApiKeyMutation()
	const deleteApiKey = useDeleteApiKeyMutation()

	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [newKeyName, setNewKeyName] = useState('')
	const [createdKey, setCreatedKey] = useState<ApiKeyWithSecret | null>(null)
	const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
	const [keyToDelete, setKeyToDelete] = useState<string | null>(null)

	const handleCreateKey = async () => {
		if (!newKeyName.trim()) {
			toast.error('Please enter a name for the API key')
			return
		}

		try {
			const result = await createApiKey.mutateAsync({ name: newKeyName.trim() })
			setCreatedKey(result)
			setNewKeyName('')
			toast.success('API key created successfully')
		} catch (_err) {
			toast.error('Failed to create API key')
		}
	}

	const handleCopyKey = async (key: string, keyId: string) => {
		try {
			await navigator.clipboard.writeText(key)
			setCopiedKeyId(keyId)
			toast.success('API key copied to clipboard')
			setTimeout(() => setCopiedKeyId(null), 2000)
		} catch (_err) {
			toast.error('Failed to copy to clipboard')
		}
	}

	const handleDeleteKey = async (keyId: string) => {
		try {
			await deleteApiKey.mutateAsync({ id: keyId })
			setKeyToDelete(null)
			toast.success('API key revoked successfully')
		} catch (_err) {
			toast.error('Failed to revoke API key')
		}
	}

	const handleCloseCreateDialog = () => {
		setIsCreateDialogOpen(false)
		setCreatedKey(null)
		setNewKeyName('')
	}

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'Never'
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	if (isPending) {
		return (
			<div className="flex-1 space-y-6 p-8 pt-6">
				<Skeleton className="h-9 w-32" />
				<div className="grid gap-6">
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex-1 space-y-6 p-8 pt-6">
				<h2 className="text-3xl font-bold tracking-tight">API Keys</h2>
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">Failed to load API keys. Please try again.</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	const apiKeys = data?.apiKeys ?? []

	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">API Keys</h2>
				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="mr-2 h-4 w-4" />
							Create API Key
						</Button>
					</DialogTrigger>
					<DialogContent>
						{!createdKey ? (
							<>
								<DialogHeader>
									<DialogTitle>Create API Key</DialogTitle>
									<DialogDescription>
										Create a new API key for programmatic access to your workspace.
									</DialogDescription>
								</DialogHeader>
								<div className="grid gap-4 py-4">
									<div className="grid gap-2">
										<Label htmlFor="keyName">Name</Label>
										<Input
											id="keyName"
											placeholder="Production API Key"
											value={newKeyName}
											onChange={(e: ChangeEvent<HTMLInputElement>) => setNewKeyName(e.target.value)}
										/>
										<p className="text-xs text-muted-foreground">
											A descriptive name to identify this key.
										</p>
									</div>
								</div>
								<DialogFooter>
									<Button variant="outline" onClick={handleCloseCreateDialog}>
										Cancel
									</Button>
									<Button onClick={handleCreateKey} disabled={createApiKey.isPending}>
										{createApiKey.isPending ? 'Creating...' : 'Create Key'}
									</Button>
								</DialogFooter>
							</>
						) : (
							<>
								<DialogHeader>
									<DialogTitle>API Key Created</DialogTitle>
									<DialogDescription>
										Copy your API key now. You will not be able to see it again.
									</DialogDescription>
								</DialogHeader>
								<div className="grid gap-4 py-4">
									<div className="grid gap-2">
										<Label>Your API Key</Label>
										<div className="flex items-center gap-2">
											<Input
												readOnly
												value={createdKey.key}
												className="font-mono text-sm bg-muted"
											/>
											<Button
												size="icon"
												variant="outline"
												onClick={() => handleCopyKey(createdKey.key, createdKey.id)}
											>
												{copiedKeyId === createdKey.id ? (
													<Check className="h-4 w-4 text-green-500" />
												) : (
													<Copy className="h-4 w-4" />
												)}
											</Button>
										</div>
										<p className="text-xs text-destructive font-medium">
											Make sure to copy your API key now. You will not be able to see it again!
										</p>
									</div>
								</div>
								<DialogFooter>
									<Button onClick={handleCloseCreateDialog}>Done</Button>
								</DialogFooter>
							</>
						)}
					</DialogContent>
				</Dialog>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Key className="h-5 w-5 text-zinc-500" />
						<CardTitle>Workspace API Keys</CardTitle>
					</div>
					<CardDescription>
						Manage API keys for programmatic access to your agents. Use the{' '}
						<code className="text-xs bg-muted px-1 py-0.5 rounded">Authorization: Bearer</code>{' '}
						header with your API key.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{apiKeys.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Key className="h-12 w-12 text-muted-foreground/50 mb-4" />
							<h3 className="text-lg font-medium">No API keys yet</h3>
							<p className="text-sm text-muted-foreground mt-1 mb-4">
								Create an API key to access your agents programmatically.
							</p>
							<Button onClick={() => setIsCreateDialogOpen(true)}>
								<Plus className="mr-2 h-4 w-4" />
								Create API Key
							</Button>
						</div>
					) : (
						<div className="space-y-4">
							{apiKeys.map((apiKey) => (
								<div
									key={apiKey.id}
									className="flex items-center justify-between p-4 border rounded-lg"
								>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<p className="font-medium">{apiKey.name}</p>
											{apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date() && (
												<Badge variant="destructive">Expired</Badge>
											)}
										</div>
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											<span className="font-mono">{apiKey.prefix}...</span>
											<span>Created {formatDate(apiKey.createdAt)}</span>
											<span>Last used {formatDate(apiKey.lastUsedAt)}</span>
										</div>
										{apiKey.permissions && (
											<div className="flex items-center gap-2 mt-2">
												{apiKey.permissions.scopes?.map((scope) => (
													<Badge key={scope} variant="secondary">
														{scope}
													</Badge>
												))}
											</div>
										)}
									</div>
									<div className="flex items-center gap-2">
										<Dialog
											open={keyToDelete === apiKey.id}
											onOpenChange={(open) => !open && setKeyToDelete(null)}
										>
											<DialogTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => setKeyToDelete(apiKey.id)}
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle>Revoke API Key</DialogTitle>
													<DialogDescription>
														Are you sure you want to revoke the API key "{apiKey.name}"? This action
														cannot be undone and any applications using this key will stop working.
													</DialogDescription>
												</DialogHeader>
												<DialogFooter>
													<Button variant="outline" onClick={() => setKeyToDelete(null)}>
														Cancel
													</Button>
													<Button
														variant="destructive"
														onClick={() => handleDeleteKey(apiKey.id)}
														disabled={deleteApiKey.isPending}
													>
														{deleteApiKey.isPending ? 'Revoking...' : 'Revoke Key'}
													</Button>
												</DialogFooter>
											</DialogContent>
										</Dialog>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Usage</CardTitle>
					<CardDescription>How to use your API key to access agents</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label>HTTP Request with Authorization Header</Label>
						<pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
							{`curl -X POST https://your-app.com/api/agents/{agent_id}/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello, agent!"}'`}
						</pre>
					</div>
					<div className="space-y-2">
						<Label>JavaScript/TypeScript</Label>
						<pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
							{`const response = await fetch('/api/agents/{agent_id}/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: 'Hello, agent!' }),
});`}
						</pre>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
