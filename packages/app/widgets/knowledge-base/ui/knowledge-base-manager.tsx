'use client'

import { Badge } from '@hare/ui/components/badge'
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
import { Textarea } from '@hare/ui/components/textarea'
import { cn } from '@hare/ui/lib/utils'
import { BookOpen, FileText, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

export interface KnowledgeBase {
	id: string
	name: string
	description: string | null
	documentCount?: number
	totalChunks?: number
	createdAt: string
}

export interface KnowledgeBaseManagerProps {
	knowledgeBases: KnowledgeBase[]
	isLoading?: boolean
	onCreateKnowledgeBase: (options: { name: string; description?: string }) => void
	onDeleteKnowledgeBase: (id: string) => void
	onSelectKnowledgeBase: (id: string) => void
	className?: string
}

export function KnowledgeBaseManager({
	knowledgeBases,
	isLoading,
	onCreateKnowledgeBase,
	onDeleteKnowledgeBase,
	onSelectKnowledgeBase,
	className,
}: KnowledgeBaseManagerProps) {
	const [createOpen, setCreateOpen] = useState(false)
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')

	const handleCreate = () => {
		if (!name.trim()) return
		onCreateKnowledgeBase({ name: name.trim(), description: description.trim() || undefined })
		setName('')
		setDescription('')
		setCreateOpen(false)
	}

	return (
		<div className={cn('space-y-4', className)}>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<BookOpen className="h-5 w-5 text-muted-foreground" />
					<h3 className="text-lg font-semibold">Knowledge Bases</h3>
				</div>
				<Dialog open={createOpen} onOpenChange={setCreateOpen}>
					<DialogTrigger asChild>
						<Button size="sm" className="gap-2">
							<Plus className="h-4 w-4" />
							New Knowledge Base
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create Knowledge Base</DialogTitle>
							<DialogDescription>
								Upload documents and URLs for your agent to search and reference.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="kb-name">Name</Label>
								<Input
									id="kb-name"
									placeholder="Product Documentation"
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="kb-description">Description</Label>
								<Textarea
									id="kb-description"
									placeholder="All product docs, FAQs, and guides"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={3}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setCreateOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleCreate} disabled={!name.trim()}>
								Create
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : knowledgeBases.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-12">
						<BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<h4 className="text-sm font-medium text-muted-foreground mb-1">
							No knowledge bases yet
						</h4>
						<p className="text-xs text-muted-foreground mb-4">
							Create a knowledge base to give your agents access to your documents and data.
						</p>
						<Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Create your first knowledge base
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3">
					{knowledgeBases.map((kb) => (
						<Card
							key={kb.id}
							className="cursor-pointer hover:border-primary/50 transition-colors"
							onClick={() => onSelectKnowledgeBase(kb.id)}
						>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm font-medium">{kb.name}</CardTitle>
									<div className="flex items-center gap-2">
										<Badge variant="secondary" className="text-xs gap-1">
											<FileText className="h-3 w-3" />
											{kb.documentCount ?? 0} docs
										</Badge>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-muted-foreground hover:text-destructive"
											onClick={(e) => {
												e.stopPropagation()
												onDeleteKnowledgeBase(kb.id)
											}}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
								{kb.description && (
									<CardDescription className="text-xs">{kb.description}</CardDescription>
								)}
							</CardHeader>
						</Card>
					))}
				</div>
			)}
		</div>
	)
}
