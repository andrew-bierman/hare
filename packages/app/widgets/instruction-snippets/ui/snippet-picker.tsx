'use client'

import type { InstructionSnippet, SnippetCategory } from '@hare/config'
import { INSTRUCTION_SNIPPETS, SNIPPET_CATEGORIES } from '@hare/config'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hare/ui/components/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@hare/ui/components/dialog'
import { ScrollArea } from '@hare/ui/components/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hare/ui/components/tabs'
import { cn } from '@hare/ui/lib/utils'
import { BookOpen, Plus } from 'lucide-react'
import { useState } from 'react'

export interface SnippetPickerProps {
	onInsert: (content: string) => void
	className?: string
}

export function SnippetPicker({ onInsert, className }: SnippetPickerProps) {
	const [open, setOpen] = useState(false)
	const [activeCategory, setActiveCategory] = useState<SnippetCategory>('persona')

	const handleInsert = (snippet: InstructionSnippet) => {
		onInsert(snippet.content)
		setOpen(false)
	}

	const snippetsByCategory = SNIPPET_CATEGORIES.map((cat) => ({
		...cat,
		snippets: INSTRUCTION_SNIPPETS.filter((s) => s.category === cat.id),
	}))

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className={cn('gap-2', className)}>
					<BookOpen className="h-4 w-4" />
					Prompt Library
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[80vh]">
				<DialogHeader>
					<DialogTitle>Instruction Snippets</DialogTitle>
					<DialogDescription>
						Pre-built instruction blocks you can add to your agent's prompt. Click to insert.
					</DialogDescription>
				</DialogHeader>
				<Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as SnippetCategory)}>
					<TabsList className="w-full flex-wrap h-auto gap-1">
						{SNIPPET_CATEGORIES.map((cat) => (
							<TabsTrigger key={cat.id} value={cat.id} className="text-xs">
								{cat.name}
							</TabsTrigger>
						))}
					</TabsList>
					<ScrollArea className="h-[400px] mt-4">
						{snippetsByCategory.map((cat) => (
							<TabsContent key={cat.id} value={cat.id} className="space-y-3 mt-0">
								{cat.snippets.map((snippet) => (
									<Card
										key={snippet.id}
										className="cursor-pointer hover:border-primary/50 transition-colors"
										onClick={() => handleInsert(snippet)}
									>
										<CardHeader className="pb-2">
											<div className="flex items-center justify-between">
												<CardTitle className="text-sm font-medium">{snippet.name}</CardTitle>
												<Badge variant="secondary" className="text-xs">
													<Plus className="h-3 w-3 mr-1" />
													Insert
												</Badge>
											</div>
											<CardDescription className="text-xs">{snippet.description}</CardDescription>
										</CardHeader>
										<CardContent className="pt-0">
											<p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
												{snippet.content}
											</p>
										</CardContent>
									</Card>
								))}
							</TabsContent>
						))}
					</ScrollArea>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}
