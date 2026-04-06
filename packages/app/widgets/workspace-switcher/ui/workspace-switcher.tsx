'use client'

import { Button } from '@hare/ui/components/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@hare/ui/components/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@hare/ui/components/dropdown-menu'
import { Input } from '@hare/ui/components/input'
import { Label } from '@hare/ui/components/label'
import { Skeleton } from '@hare/ui/components/skeleton'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { type ChangeEvent, type KeyboardEvent, useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from '../../../app/providers'
import { useCreateWorkspaceMutation } from '../../../shared/api/hooks'

export function WorkspaceSwitcher() {
	const { workspaces, activeWorkspace, setActiveWorkspace, isLoading } = useWorkspace()
	const createWorkspace = useCreateWorkspaceMutation()
	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [newWorkspaceName, setNewWorkspaceName] = useState('')

	const handleCreateWorkspace = async () => {
		if (!newWorkspaceName.trim()) return

		try {
			const name = newWorkspaceName.trim()
			// Generate slug from name: lowercase, replace spaces with dashes, remove non-alphanumeric
			const slug = name
				.toLowerCase()
				.replace(/\s+/g, '-')
				.replace(/[^a-z0-9-]/g, '')
			const workspace = await createWorkspace.mutateAsync({
				name,
				slug,
			})
			setActiveWorkspace(workspace)
			setIsCreateOpen(false)
			setNewWorkspaceName('')
			toast.success('Workspace created')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create workspace')
		}
	}

	if (isLoading) {
		return <Skeleton className="h-10 w-full" />
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" className="w-full justify-between">
						<span className="truncate">{activeWorkspace?.name || 'Select workspace'}</span>
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-64" align="start">
					<DropdownMenuLabel>Workspaces</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{workspaces.map((workspace) => (
						<DropdownMenuItem
							key={workspace.id}
							onClick={() => setActiveWorkspace(workspace)}
							className="flex items-center justify-between"
						>
							<div className="flex flex-col gap-1">
								<div className="font-medium">{workspace.name}</div>
								<div className="text-xs text-muted-foreground">{workspace.slug}</div>
							</div>
							{activeWorkspace?.id === workspace.id && <Check className="h-4 w-4 text-primary" />}
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => setIsCreateOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Create workspace...
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Workspace</DialogTitle>
						<DialogDescription>
							Create a new workspace to organize your agents and tools.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="workspace-name">Workspace Name</Label>
							<Input
								id="workspace-name"
								placeholder="My Workspace"
								value={newWorkspaceName}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setNewWorkspaceName(e.target.value)}
								onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
									if (e.key === 'Enter') {
										handleCreateWorkspace()
									}
								}}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsCreateOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCreateWorkspace}
							disabled={!newWorkspaceName.trim() || createWorkspace.isPending}
						>
							{createWorkspace.isPending ? 'Creating...' : 'Create'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
