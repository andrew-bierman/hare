/**
 * Data Table Component
 *
 * Reusable data table built on TanStack Table with sorting, filtering, and pagination.
 */

import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from '@tanstack/react-table'
import { Button } from '@hare/ui/components/button'
import { Checkbox } from '@hare/ui/components/checkbox'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@hare/ui/components/dropdown-menu'
import { Input } from '@hare/ui/components/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@hare/ui/components/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@hare/ui/components/table'
import { cn } from '@hare/ui/lib/utils'
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Search,
	Settings2,
} from 'lucide-react'
import { useState } from 'react'

export interface DataTableProps<TData, TValue> {
	/** Column definitions */
	columns: ColumnDef<TData, TValue>[]
	/** Data to display */
	data: TData[]
	/** Enable row selection */
	enableRowSelection?: boolean
	/** Enable column visibility toggle */
	enableColumnVisibility?: boolean
	/** Enable global search filter */
	enableSearch?: boolean
	/** Search placeholder text */
	searchPlaceholder?: string
	/** Column to use for global search */
	searchColumn?: string
	/** Page size options */
	pageSizeOptions?: number[]
	/** Initial page size */
	initialPageSize?: number
	/** Empty state message */
	emptyMessage?: string
	/** Get row ID for selection */
	getRowId?: (row: TData) => string
	/** Callback when selection changes */
	onSelectionChange?: (selectedRows: TData[]) => void
}

/**
 * Generic data table component with full features
 *
 * @example
 * ```tsx
 * const columns = [
 *   { accessorKey: 'name', header: 'Name' },
 *   { accessorKey: 'status', header: 'Status' },
 *   { accessorKey: 'createdAt', header: 'Created' },
 * ]
 *
 * function AgentsTable({ agents }) {
 *   return (
 *     <DataTable
 *       columns={columns}
 *       data={agents}
 *       enableSearch
 *       searchColumn="name"
 *       searchPlaceholder="Search agents..."
 *     />
 *   )
 * }
 * ```
 */
export function DataTable<TData, TValue>({
	columns,
	data,
	enableRowSelection = false,
	enableColumnVisibility = false,
	enableSearch = false,
	searchPlaceholder = 'Search...',
	searchColumn,
	pageSizeOptions = [10, 20, 30, 50, 100],
	initialPageSize = 10,
	emptyMessage = 'No results found.',
	getRowId,
	onSelectionChange,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
	const [globalFilter, setGlobalFilter] = useState('')

	// Add selection column if enabled
	const allColumns: ColumnDef<TData, TValue>[] = enableRowSelection
		? [
				{
					id: 'select',
					header: ({ table }) => (
						<Checkbox
							checked={
								table.getIsAllPageRowsSelected() ||
								(table.getIsSomePageRowsSelected() && 'indeterminate')
							}
							onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
							aria-label="Select all"
						/>
					),
					cell: ({ row }) => (
						<Checkbox
							checked={row.getIsSelected()}
							onCheckedChange={(value) => row.toggleSelected(!!value)}
							aria-label="Select row"
						/>
					),
					enableSorting: false,
					enableHiding: false,
				},
				...columns,
			]
		: columns

	const table = useReactTable({
		data,
		columns: allColumns,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			globalFilter,
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: (updater) => {
			const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
			setRowSelection(newSelection)

			if (onSelectionChange) {
				const selectedRows = Object.keys(newSelection)
					.filter((key) => newSelection[key])
					.map((key) => data[parseInt(key, 10)])
				onSelectionChange(selectedRows)
			}
		},
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		enableRowSelection,
		getRowId,
		initialState: {
			pagination: {
				pageSize: initialPageSize,
			},
		},
	})

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex items-center justify-between gap-4">
				{/* Search */}
				{enableSearch && (
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder={searchPlaceholder}
							value={
								searchColumn
									? ((table.getColumn(searchColumn)?.getFilterValue() as string) ?? '')
									: globalFilter
							}
							onChange={(event) => {
								if (searchColumn) {
									table.getColumn(searchColumn)?.setFilterValue(event.target.value)
								} else {
									setGlobalFilter(event.target.value)
								}
							}}
							className="pl-9"
						/>
					</div>
				)}

				<div className="flex items-center gap-2">
					{/* Selection count */}
					{enableRowSelection && Object.keys(rowSelection).length > 0 && (
						<span className="text-sm text-muted-foreground">
							{Object.keys(rowSelection).filter((k) => rowSelection[k]).length} selected
						</span>
					)}

					{/* Column visibility */}
					{enableColumnVisibility && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" className="gap-2">
									<Settings2 className="h-4 w-4" />
									Columns
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-40">
								{table
									.getAllColumns()
									.filter((column) => column.getCanHide())
									.map((column) => (
										<DropdownMenuCheckboxItem
											key={column.id}
											checked={column.getIsVisible()}
											onCheckedChange={(value) => column.toggleVisibility(!!value)}
										>
											{column.id}
										</DropdownMenuCheckboxItem>
									))}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id} className="whitespace-nowrap">
										{header.isPlaceholder ? null : header.column.getCanSort() ? (
											<button
												type="button"
												className={cn('flex items-center gap-2 cursor-pointer select-none')}
												onClick={header.column.getToggleSortingHandler()}
											>
												{flexRender(header.column.columnDef.header, header.getContext())}
												<span className="text-muted-foreground">
													{header.column.getIsSorted() === 'desc' ? (
														<ArrowDown className="h-4 w-4" />
													) : header.column.getIsSorted() === 'asc' ? (
														<ArrowUp className="h-4 w-4" />
													) : (
														<ArrowUpDown className="h-4 w-4" />
													)}
												</span>
											</button>
										) : (
											<div className="flex items-center gap-2">
												{flexRender(header.column.columnDef.header, header.getContext())}
											</div>
										)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={allColumns.length} className="h-24 text-center">
									{emptyMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">Rows per page</span>
					<Select
						value={table.getState().pagination.pageSize.toString()}
						onValueChange={(value) => table.setPageSize(Number(value))}
					>
						<SelectTrigger className="h-8 w-16">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{pageSizeOptions.map((size) => (
								<SelectItem key={size} value={size.toString()}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">
						Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
					</span>
					<div className="flex items-center gap-1">
						<Button
							variant="outline"
							size="icon"
							className="h-8 w-8"
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}
						>
							<ChevronsLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="h-8 w-8"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="h-8 w-8"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="h-8 w-8"
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}
						>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
