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
} from '@hare/ui/components/dialog'
import { Input } from '@hare/ui/components/input'
import { SearchInput } from '@hare/ui/components/search-input'
import { Label } from '@hare/ui/components/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@hare/ui/components/select'
import { Skeleton } from '@hare/ui/components/skeleton'
import { Textarea } from '@hare/ui/components/textarea'
import {
	Brain,
	Clock,
	MessageSquare,
	Pencil,
	Plus,
	Settings,
	Sparkles,
	Tag,
	Trash2,
	User,
} from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import { toast } from 'sonner'
import {
	type Memory,
	type MemoryType,
	useClearMemoriesMutation,
	useCreateMemoryMutation,
	useDeleteMemoryMutation,
	useMemoriesQuery,
	useSearchMemoriesMutation,
	useUpdateMemoryMutation,
} from '../../../shared/api/hooks'

export interface MemoryViewerProps {
	agentId: string
	workspaceId: string
}

const MEMORY_TYPE_CONFIG: Record<
	MemoryType,
	{ label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
	fact: { label: 'Fact', icon: Brain, color: 'bg-blue-100 text-blue-700' },
	context: { label: 'Context', icon: Settings, color: 'bg-purple-100 text-purple-700' },
	preference: { label: 'Preference', icon: User, color: 'bg-green-100 text-green-700' },
	conversation: {
		label: 'Conversation',
		icon: MessageSquare,
		color: 'bg-orange-100 text-orange-700',
	},
	custom: { label: 'Custom', icon: Sparkles, color: 'bg-gray-100 text-gray-700' },
}

function MemoryCard(props: {
	memory: Memory
	onEdit: (memory: Memory) => void
	onDelete: (memoryId: string) => void
}) {
	const { memory, onEdit, onDelete } = props
	const typeConfig = MEMORY_TYPE_CONFIG[memory.metadata.type] || MEMORY_TYPE_CONFIG.custom
	const IconComponent = typeconfig.icon

	return (
		<div className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<Badge className={typeconfig.color}>
						<IconComponent className="h-3 w-3 mr-1" />
						{typeconfig.label}
					</Badge>
					{memory.score !== undefined && (
						<Badge variant="outline" className="text-xs">
							{Math.round(memory.score * 100)}% match
						</Badge>
					)}
				</div>
				<div className="flex items-center gap-1">
					<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(memory)}>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-destructive"
						onClick={() => onDelete(memory.id)}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<p className="text-sm text-foreground line-clamp-3">{memory.content}</p>

			<div className="flex items-center gap-4 text-xs text-muted-foreground">
				<div className="flex items-center gap-1">
					<Clock className="h-3 w-3" />
					{new Date(memory.metadata.createdAt).toLocaleDateString()}
				</div>
				{memory.metadata.tags && memory.metadata.tags.length > 0 && (
					<div className="flex items-center gap-1">
						<Tag className="h-3 w-3" />
						{memory.metadata.tags.slice(0, 3).join(', ')}
						{memory.metadata.tags.length > 3 && ` +${memory.metadata.tags.length - 3}`}
					</div>
				)}
			</div>
		</div>
	)
}

function MemoryListSkeleton() {
	return (
		<div className="space-y-3">
			{[1, 2, 3].map((i) => (
				<div key={i} className="border rounded-lg p-4 space-y-3">
					<div className="flex items-center gap-2">
						<Skeleton className="h-5 w-20" />
						<Skeleton className="h-5 w-16" />
					</div>
					<Skeleton className="h-12 w-full" />
					<div className="flex items-center gap-4">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>
			))}
		</div>
	)
}

export function MemoryViewer(props: MemoryViewerProps) {
	const { agentId, workspaceId } = props

	const [searchQuery, setSearchQuery] = useState('')
	const [isSearching, setIsSearching] = useState(false)
	const [searchResults, setSearchResults] = useState<Memory[] | null>(null)
	const [isAddOpen, setIsAddOpen] = useState(false)
	const [isEditOpen, setIsEditOpen] = useState(false)
	const [isClearOpen, setIsClearOpen] = useState(false)
	const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)

	// Form state for add/edit
	const [formContent, setFormContent] = useState('')
	const [formType, setFormType] = useState<MemoryType>('custom')
	const [formTags, setFormTags] = useState('')

	const { data: memoriesData, isLoading } = useMemoriesQuery({
		agentId,
		workspaceId,
		limit: 50,
	})

	const createMemory = useCreateMemoryMutation({ agentId, workspaceId })
	const updateMemory = useUpdateMemoryMutation({ agentId, workspaceId })
	const deleteMemory = useDeleteMemoryMutation({ agentId, workspaceId })
	const clearMemories = useClearMemoriesMutation({ agentId, workspaceId })
	const searchMemories = useSearchMemoriesMutation({ agentId, workspaceId })

	const memories = searchResults ?? memoriesData?.memories ?? []
	const totalCount = memoriesData?.total ?? 0

	const handleSearch = async () => {
		if (!searchQuery.trim()) {
			setSearchResults(null)
			return
		}

		setIsSearching(true)
		try {
			const result = await searchMemories.mutateAsync({
				query: searchQuery,
				topK: 20,
			})
			setSearchResults(result.memories)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Search failed')
		} finally {
			setIsSearching(false)
		}
	}

	const handleClearSearch = () => {
		setSearchQuery('')
		setSearchResults(null)
	}

	const handleOpenAdd = () => {
		setFormContent('')
		setFormType('custom')
		setFormTags('')
		setIsAddOpen(true)
	}

	const handleOpenEdit = (memory: Memory) => {
		setSelectedMemory(memory)
		setFormContent(memory.content)
		setFormType(memory.metadata.type)
		setFormTags(memory.metadata.tags?.join(', ') || '')
		setIsEditOpen(true)
	}

	const handleAdd = async () => {
		if (!formContent.trim()) {
			toast.error('Content is required')
			return
		}

		try {
			await createMemory.mutateAsync({
				content: formContent.trim(),
				type: formType,
				tags: formTags
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean),
			})
			toast.success('Memory added')
			setIsAddOpen(false)
			if (searchResults) {
				setSearchResults(null)
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add memory')
		}
	}

	const handleEdit = async () => {
		if (!selectedMemory || !formContent.trim()) {
			toast.error('Content is required')
			return
		}

		try {
			await updateMemory.mutateAsync({
				memoryId: selectedMemory.id,
				data: {
					content: formContent.trim(),
					type: formType,
					tags: formTags
						.split(',')
						.map((t) => t.trim())
						.filter(Boolean),
				},
			})
			toast.success('Memory updated')
			setIsEditOpen(false)
			setSelectedMemory(null)
			if (searchResults) {
				setSearchResults(null)
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update memory')
		}
	}

	const handleDelete = async (memoryId: string) => {
		try {
			await deleteMemory.mutateAsync(memoryId)
			toast.success('Memory deleted')
			if (searchResults) {
				setSearchResults(searchResults.filter((m) => m.id !== memoryId))
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete memory')
		}
	}

	const handleClearAll = async () => {
		try {
			const result = await clearMemories.mutateAsync()
			toast.success(`Cleared ${result.deleted} memories`)
			setIsClearOpen(false)
			setSearchResults(null)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to clear memories')
		}
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Brain className="h-5 w-5" />
							Vector Memory
						</CardTitle>
						<CardDescription>
							{totalCount} memories stored. Search and manage your agent's long-term memory.
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={handleOpenAdd}>
							<Plus className="h-4 w-4 mr-1" />
							Add
						</Button>
						{totalCount > 0 && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsClearOpen(true)}
								className="text-destructive"
							>
								<Trash2 className="h-4 w-4 mr-1" />
								Clear All
							</Button>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Search Bar */}
				<div className="flex gap-2">
					<SearchInput
						placeholder="Search memories semantically..."
						value={searchQuery}
						onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
						containerClassName="flex-1"
					/>
					<Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
						{isSearching ? 'Searching...' : 'Search'}
					</Button>
					{searchResults && (
						<Button variant="outline" onClick={handleClearSearch}>
							Clear
						</Button>
					)}
				</div>

				{searchResults && (
					<div className="text-sm text-muted-foreground">
						Found {searchResults.length} results for "{searchQuery}"
					</div>
				)}

				{/* Memory List */}
				{isLoading ? (
					<MemoryListSkeleton />
				) : memories.length === 0 ? (
					<div className="text-center py-8">
						<Brain className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
						<p className="text-muted-foreground">
							{searchResults ? 'No memories found for this search' : 'No memories stored yet'}
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							{searchResults
								? 'Try a different search query'
								: 'Memories will be stored as your agent learns from conversations'}
						</p>
					</div>
				) : (
					<div className="space-y-3 max-h-[500px] overflow-y-auto">
						{memories.map((memory) => (
							<MemoryCard
								key={memory.id}
								memory={memory}
								onEdit={handleOpenEdit}
								onDelete={handleDelete}
							/>
						))}
					</div>
				)}
			</CardContent>

			{/* Add Memory Dialog */}
			<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Memory</DialogTitle>
						<DialogDescription>
							Store new information in your agent's long-term memory.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>Content</Label>
							<Textarea
								value={formContent}
								onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormContent(e.target.value)}
								placeholder="Enter the information to remember..."
								className="h-32"
							/>
						</div>
						<div className="space-y-2">
							<Label>Type</Label>
							<Select value={formType} onValueChange={(v) => setFormType(v as MemoryType)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(MEMORY_TYPE_CONFIG).map(([type, config]) => (
										<SelectItem key={type} value={type}>
											<div className="flex items-center gap-2">
												<config.icon className="h-4 w-4" />
												{config.label}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Tags (comma-separated)</Label>
							<Input
								value={formTags}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setFormTags(e.target.value)}
								placeholder="tag1, tag2, tag3"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsAddOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleAdd} disabled={createMemory.isPending}>
							{createMemory.isPending ? 'Adding...' : 'Add Memory'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Memory Dialog */}
			<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Memory</DialogTitle>
						<DialogDescription>Update this memory's content and metadata.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>Content</Label>
							<Textarea
								value={formContent}
								onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormContent(e.target.value)}
								placeholder="Enter the information to remember..."
								className="h-32"
							/>
						</div>
						<div className="space-y-2">
							<Label>Type</Label>
							<Select value={formType} onValueChange={(v) => setFormType(v as MemoryType)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(MEMORY_TYPE_CONFIG).map(([type, config]) => (
										<SelectItem key={type} value={type}>
											<div className="flex items-center gap-2">
												<config.icon className="h-4 w-4" />
												{config.label}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Tags (comma-separated)</Label>
							<Input
								value={formTags}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setFormTags(e.target.value)}
								placeholder="tag1, tag2, tag3"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsEditOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleEdit} disabled={updateMemory.isPending}>
							{updateMemory.isPending ? 'Saving...' : 'Save Changes'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Clear All Confirmation Dialog */}
			<Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Clear All Memories</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete all {totalCount} memories? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsClearOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleClearAll}
							disabled={clearMemories.isPending}
						>
							{clearMemories.isPending ? 'Clearing...' : 'Clear All Memories'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	)
}
