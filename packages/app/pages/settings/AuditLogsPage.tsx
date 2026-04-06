'use client'

import type { AuditAction } from '@hare/config'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hare/ui/components/card'
import { Input } from '@hare/ui/components/input'
import { Label } from '@hare/ui/components/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@hare/ui/components/select'
import { Skeleton } from '@hare/ui/components/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@hare/ui/components/table'
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Filter,
	Shield,
	X,
} from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import { useAuditLogsQuery } from '../../shared/api'

// Audit action options for the filter dropdown
const ACTION_OPTIONS: { value: AuditAction; label: string }[] = [
	{ value: 'agent.create', label: 'Agent Created' },
	{ value: 'agent.update', label: 'Agent Updated' },
	{ value: 'agent.delete', label: 'Agent Deleted' },
	{ value: 'agent.deploy', label: 'Agent Deployed' },
	{ value: 'agent.clone', label: 'Agent Cloned' },
	{ value: 'tool.create', label: 'Tool Created' },
	{ value: 'tool.update', label: 'Tool Updated' },
	{ value: 'tool.delete', label: 'Tool Deleted' },
	{ value: 'tool.test', label: 'Tool Tested' },
	{ value: 'member.invite', label: 'Member Invited' },
	{ value: 'member.remove', label: 'Member Removed' },
	{ value: 'member.role_change', label: 'Member Role Changed' },
	{ value: 'apikey.create', label: 'API Key Created' },
	{ value: 'apikey.revoke', label: 'API Key Revoked' },
	{ value: 'workspace.update', label: 'Workspace Updated' },
]

// Resource type options for the filter dropdown
const RESOURCE_TYPE_OPTIONS = [
	{ value: 'agent', label: 'Agent' },
	{ value: 'tool', label: 'Tool' },
	{ value: 'member', label: 'Member' },
	{ value: 'apikey', label: 'API Key' },
	{ value: 'workspace', label: 'Workspace' },
] as const

// Page size options
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function AuditLogsPage() {
	// Filter state
	const [actionFilter, setActionFilter] = useState<AuditAction | '__all__'>('__all__')
	const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('__all__')
	const [dateFrom, setDateFrom] = useState<string>('')
	const [dateTo, setDateTo] = useState<string>('')

	// Pagination state
	const [pageSize, setPageSize] = useState(20)
	const [currentPage, setCurrentPage] = useState(0)

	const { data, isPending, error } = useAuditLogsQuery({
		action: actionFilter === '__all__' ? undefined : actionFilter,
		resourceType: resourceTypeFilter === '__all__' ? undefined : resourceTypeFilter,
		dateFrom: dateFrom || undefined,
		dateTo: dateTo || undefined,
		limit: pageSize,
		offset: currentPage * pageSize,
	})

	const totalPages = data ? Math.ceil(data.total / pageSize) : 0

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	const formatAction = (action: string) => {
		const option = ACTION_OPTIONS.find((opt) => opt.value === action)
		return option?.label || action
	}

	const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' => {
		if (action.includes('delete') || action.includes('remove') || action.includes('revoke')) {
			return 'destructive'
		}
		if (action.includes('create') || action.includes('invite')) {
			return 'default'
		}
		return 'secondary'
	}

	const formatDetails = (details: Record<string, unknown> | null) => {
		if (!details) return '-'
		// Show a summary of the details
		const entries = Object.entries(details)
		if (entries.length === 0) return '-'
		// Show first 2 key-value pairs
		return entries
			.slice(0, 2)
			.map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
			.join(', ')
	}

	const clearFilters = () => {
		setActionFilter('__all__')
		setResourceTypeFilter('__all__')
		setDateFrom('')
		setDateTo('')
		setCurrentPage(0)
	}

	const hasFilters =
		(actionFilter && actionFilter !== '__all__') ||
		(resourceTypeFilter && resourceTypeFilter !== '__all__') ||
		dateFrom ||
		dateTo

	if (isPending) {
		return (
			<div className="flex-1 space-y-6 p-8 pt-6">
				<Skeleton className="h-9 w-40" />
				<div className="grid gap-6">
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-96 w-full" />
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex-1 space-y-6 p-8 pt-6">
				<h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">
							Failed to load audit logs. Please try again or contact support if the issue persists.
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	const logs = data?.logs ?? []

	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
			</div>

			{/* Filters Card */}
			<Card>
				<CardHeader className="pb-4">
					<div className="flex items-center gap-2">
						<Filter className="h-5 w-5 text-zinc-500" />
						<CardTitle className="text-lg">Filters</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{/* Action Type Filter */}
						<div className="space-y-2">
							<Label htmlFor="action-filter">Action Type</Label>
							<Select
								value={actionFilter}
								onValueChange={(value) => {
									setActionFilter(value as AuditAction | '__all__')
									setCurrentPage(0)
								}}
							>
								<SelectTrigger id="action-filter">
									<SelectValue placeholder="All actions" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__all__">All actions</SelectItem>
									{ACTION_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Resource Type Filter */}
						<div className="space-y-2">
							<Label htmlFor="resource-filter">Resource Type</Label>
							<Select
								value={resourceTypeFilter}
								onValueChange={(value) => {
									setResourceTypeFilter(value)
									setCurrentPage(0)
								}}
							>
								<SelectTrigger id="resource-filter">
									<SelectValue placeholder="All resources" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__all__">All resources</SelectItem>
									{RESOURCE_TYPE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Date From */}
						<div className="space-y-2">
							<Label htmlFor="date-from">From Date</Label>
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

						{/* Date To */}
						<div className="space-y-2">
							<Label htmlFor="date-to">To Date</Label>
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
						<div className="mt-4 flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={clearFilters}>
								<X className="mr-2 h-4 w-4" />
								Clear filters
							</Button>
							<span className="text-sm text-muted-foreground">
								{data?.total ?? 0} results found
							</span>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Audit Logs Table Card */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Shield className="h-5 w-5 text-zinc-500" />
						<CardTitle>Workspace Activity</CardTitle>
					</div>
					<CardDescription>
						View all actions and changes in your workspace. Only admins and owners can view audit
						logs.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{logs.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
							<h3 className="text-lg font-medium">No audit logs found</h3>
							<p className="text-sm text-muted-foreground mt-1">
								{hasFilters
									? 'Try adjusting your filters to see more results.'
									: 'Activity in your workspace will appear here.'}
							</p>
						</div>
					) : (
						<>
							{/* Table */}
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[180px]">Date</TableHead>
											<TableHead className="w-[120px]">User</TableHead>
											<TableHead className="w-[160px]">Action</TableHead>
											<TableHead className="w-[120px]">Resource</TableHead>
											<TableHead>Details</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{logs.map((log) => (
											<TableRow key={log.id}>
												<TableCell className="font-mono text-sm">
													{formatDate(log.createdAt)}
												</TableCell>
												<TableCell className="font-mono text-xs text-muted-foreground">
													{log.userId.slice(0, 8)}...
												</TableCell>
												<TableCell>
													<Badge variant={getActionBadgeVariant(log.action)}>
														{formatAction(log.action)}
													</Badge>
												</TableCell>
												<TableCell className="capitalize">{log.resourceType}</TableCell>
												<TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
													{formatDetails(log.details)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Pagination */}
							<div className="flex items-center justify-between mt-4">
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">Rows per page</span>
									<Select
										value={pageSize.toString()}
										onValueChange={(value) => {
											setPageSize(Number(value))
											setCurrentPage(0)
										}}
									>
										<SelectTrigger className="h-8 w-16">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{PAGE_SIZE_OPTIONS.map((size) => (
												<SelectItem key={size} value={size.toString()}>
													{size}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">
										Page {currentPage + 1} of {totalPages || 1}
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
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
