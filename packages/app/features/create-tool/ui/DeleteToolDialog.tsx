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
import { toast } from 'sonner'
import { useDeleteToolMutation } from '../../../shared/api/hooks'

interface DeleteToolDialogProps {
	workspaceId: string | undefined
	toolId: string | null
	toolName: string | undefined
	onOpenChange: (open: boolean) => void
}

export function DeleteToolDialog({
	workspaceId,
	toolId,
	toolName,
	onOpenChange,
}: DeleteToolDialogProps) {
	const deleteTool = useDeleteToolMutation()

	const handleDelete = async () => {
		if (!toolId) return

		try {
			await deleteTool.mutateAsync({ id: toolId })
			toast.success('Tool deleted')
			onOpenChange(false)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete tool')
		}
	}

	return (
		<Dialog open={!!toolId} onOpenChange={() => onOpenChange(false)}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Tool</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete "{toolName}"? This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleDelete} disabled={deleteTool.isPending}>
						{deleteTool.isPending ? 'Deleting...' : 'Delete'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
