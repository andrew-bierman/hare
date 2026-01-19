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
import { Input } from '@hare/ui/components/input'
import { Label } from '@hare/ui/components/label'
import { ScrollArea } from '@hare/ui/components/scroll-area'
import { SearchInput } from '@hare/ui/components/search-input'
import { Skeleton } from '@hare/ui/components/skeleton'
import { Link, useNavigate } from '@tanstack/react-router'
import {
	ArrowLeft,
	Calendar,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	MessageSquare,
	Search,
	User,
	Bot,
	X,
} from 'lucide-react'
import { type ChangeEvent, type FormEvent, useCallback, useState } from 'react'
import {
	useAgentQuery,
	useConversationSearchQuery,
	type ConversationSearchResult,
} from '../../shared/api'

export interface AgentConversationsPageProps {
	agentId: string
}

function LoadingSkeleton() {
	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			<div className="flex items-center gap-4">
				<Skeleton className="h-9 w-9" />
				<div className="space-y-2">
					<Skeleton className="h-7 w-48" />
					<Skeleton className="h-4 w-32" />
				</div>
			</div>
			<Skeleton className="h-24 w-full" />
			<div className="space-y-4">
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-24 w-full" />
			</div>
		</div>
	)
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted mb-4">
				{hasSearch ? (
					<Search className="h-8 w-8 text-muted-foreground" />
				) : (
					<MessageSquare className="h-8 w-8 text-muted-foreground" />
				)}
			</div>
			<h3 className="text-lg font-semibold mb-2">
				{hasSearch ? 'No results found' : 'Search conversations'}
			</h3>
			<p className="text-muted-foreground text-sm max-w-md">
				{hasSearch
					? 'Try adjusting your search query or date filters to find what you\'re looking for.'
					: 'Enter a search term to find messages across all conversations with this agent.'}
			</p>
		</div>
	)
}

interface SearchResultCardProps {
	result: ConversationSearchResult
	onClick: () => void
}

function SearchResultCard({ result, onClick }: SearchResultCardProps) {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	return (
		<Card
			className="cursor-pointer transition-colors hover:bg-muted/50"
			onClick={onClick}
		>
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<div
						className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
							result.role === 'user'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted'
						}`}
					>
						{result.role === 'user' ? (
							<User className="h-4 w-4" />
						) : (
							<Bot className="h-4 w-4" />
						)}
					</div>
					<div className="flex-1 min-w-0 space-y-1">
						<div className="flex items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<span className="font-medium text-sm capitalize">{result.role}</span>
								<Badge variant="outline" className="text-xs">
									{result.conversationTitle || 'Untitled'}
								</Badge>
							</div>
							<span className="text-xs text-muted-foreground whitespace-nowrap">
								{formatDate(result.createdAt)}
							</span>
						</div>
						<p
							className="text-sm text-muted-foreground line-clamp-2"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: highlighted content from API is trusted
							dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export function AgentConversationsPage({ agentId }: AgentConversationsPageProps) {
	const navigate = useNavigate()
	const { data: agent, isLoading: agentLoading, error: agentError } = useAgentQuery(agentId)

	// Search state
	const [searchInput, setSearchInput] = useState('')
	const [searchQuery, setSearchQuery] = useState('')
	const [dateFrom, setDateFrom] = useState('')
	const [dateTo, setDateTo] = useState('')

	// Pagination state
	const [currentPage, setCurrentPage] = useState(0)
	const pageSize = 20

	// Search query
	const { data: searchData, isLoading: searchLoading } = useConversationSearchQuery(
		searchQuery
			? {
					agentId,
					query: searchQuery,
					dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
					dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
					limit: pageSize,
					offset: currentPage * pageSize,
				}
			: undefined,
	)

	const totalPages = searchData ? Math.ceil(searchData.total / pageSize) : 0

	const handleSearch = (e: FormEvent) => {
		e.preventDefault()
		setSearchQuery(searchInput.trim())
		setCurrentPage(0)
	}

	const handleResultClick = useCallback(
		(result: ConversationSearchResult) => {
			// Navigate to playground with conversation ID and message ID in hash for scrolling
			navigate({
				to: '/dashboard/agents/$id/playground',
				params: { id: agentId },
				hash: `${result.conversationId}:${result.messageId}`,
			})
		},
		[navigate, agentId],
	)

	const clearFilters = () => {
		setDateFrom('')
		setDateTo('')
		setCurrentPage(0)
	}

	const hasFilters = dateFrom || dateTo
	const hasSearch = searchQuery.trim().length > 0

	if (agentLoading) {
		return <LoadingSkeleton />
	}

	if (agentError || !agent) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-8">
				<Card className="max-w-md w-full">
					<CardContent className="pt-6 text-center">
						<p className="text-destructive mb-4">{agentError?.message || 'Agent not found'}</p>
						<Link to="/dashboard/agents">
							<Button variant="outline">Back to Agents</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link to="/dashboard/agents/$id" params={{ id: agentId }}>
					<Button variant="ghost" size="icon" className="h-9 w-9">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Search Conversations</h2>
					<p className="text-muted-foreground text-sm">
						Search through past conversations with {agent.name}
					</p>
				</div>
			</div>

			{/* Search and Filters Card */}
			<Card>
				<CardHeader className="pb-4">
					<div className="flex items-center gap-2">
						<Search className="h-5 w-5 text-muted-foreground" />
						<CardTitle className="text-lg">Search</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSearch} className="space-y-4">
						{/* Search Input */}
						<div className="flex gap-2">
							<SearchInput
								placeholder="Search messages..."
								value={searchInput}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
								className="flex-1"
							/>
							<Button type="submit" disabled={!searchInput.trim()}>
								Search
							</Button>
						</div>

						{/* Date Filters */}
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="date-from" className="flex items-center gap-2">
									<Calendar className="h-4 w-4" />
									From Date
								</Label>
								<Input
									id="date-from"
									type="date"
									value={dateFrom}
									onChange={(e: ChangeEvent<HTMLInputElement>) => {
										setDateFrom(e.target.value)
										setCurrentPage(0)
									}}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="date-to" className="flex items-center gap-2">
									<Calendar className="h-4 w-4" />
									To Date
								</Label>
								<Input
									id="date-to"
									type="date"
									value={dateTo}
									onChange={(e: ChangeEvent<HTMLInputElement>) => {
										setDateTo(e.target.value)
										setCurrentPage(0)
									}}
								/>
							</div>
						</div>

						{hasFilters && (
							<div className="flex items-center gap-2">
								<Button type="button" variant="outline" size="sm" onClick={clearFilters}>
									<X className="mr-2 h-4 w-4" />
									Clear date filters
								</Button>
							</div>
						)}
					</form>
				</CardContent>
			</Card>

			{/* Results */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<MessageSquare className="h-5 w-5 text-muted-foreground" />
							<CardTitle>Results</CardTitle>
						</div>
						{hasSearch && searchData && (
							<span className="text-sm text-muted-foreground">
								{searchData.total} message{searchData.total !== 1 ? 's' : ''} found
							</span>
						)}
					</div>
					{hasSearch && (
						<CardDescription>
							Showing results for "{searchQuery}"
							{hasFilters && ' with date filters applied'}
						</CardDescription>
					)}
				</CardHeader>
				<CardContent>
					{searchLoading ? (
						<div className="space-y-4">
							<Skeleton className="h-24 w-full" />
							<Skeleton className="h-24 w-full" />
							<Skeleton className="h-24 w-full" />
						</div>
					) : !hasSearch || !searchData?.results.length ? (
						<EmptyState hasSearch={hasSearch} />
					) : (
						<>
							<ScrollArea className="max-h-[600px]">
								<div className="space-y-3 pr-4">
									{searchData.results.map((result) => (
										<SearchResultCard
											key={result.messageId}
											result={result}
											onClick={() => handleResultClick(result)}
										/>
									))}
								</div>
							</ScrollArea>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="flex items-center justify-between mt-6 pt-4 border-t">
									<span className="text-sm text-muted-foreground">
										Page {currentPage + 1} of {totalPages}
									</span>
									<div className="flex items-center gap-1">
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											onClick={() => setCurrentPage(0)}
											disabled={currentPage === 0}
										>
											<ChevronsLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
											disabled={currentPage === 0}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
											disabled={currentPage >= totalPages - 1}
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											onClick={() => setCurrentPage(totalPages - 1)}
											disabled={currentPage >= totalPages - 1}
										>
											<ChevronsRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
