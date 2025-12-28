/**
 * TanStack Table Utilities
 *
 * Headless table utilities for building powerful data grids.
 *
 * @see https://tanstack.com/table/latest/docs/introduction
 */

import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type Row,
	type RowSelectionState,
	type SortingState,
	type Table,
	useReactTable,
	type VisibilityState,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'

/**
 * Re-export commonly used table utilities
 */
export {
	flexRender,
	type ColumnDef,
	type SortingState,
	type ColumnFiltersState,
	type PaginationState,
	type VisibilityState,
	type RowSelectionState,
	type Table,
	type Row,
}

/**
 * Options for creating a data table
 */
export interface UseDataTableOptions<TData> {
	/** Data to display in the table */
	data: TData[]
	/** Column definitions */
	columns: ColumnDef<TData, unknown>[]
	/** Initial sorting state */
	initialSorting?: SortingState
	/** Initial pagination state */
	initialPagination?: PaginationState
	/** Enable row selection */
	enableRowSelection?: boolean
	/** Enable multi-row selection */
	enableMultiRowSelection?: boolean
	/** Enable column visibility toggle */
	enableColumnVisibility?: boolean
	/** Page size options */
	pageSizeOptions?: number[]
	/** Get row ID for selection */
	getRowId?: (row: TData) => string
}

/**
 * Hook for creating a feature-rich data table
 *
 * @example
 * ```tsx
 * const columns = [
 *   { accessorKey: 'name', header: 'Name' },
 *   { accessorKey: 'email', header: 'Email' },
 *   { accessorKey: 'status', header: 'Status' },
 * ]
 *
 * function UsersTable({ users }) {
 *   const table = useDataTable({
 *     data: users,
 *     columns,
 *     enableRowSelection: true,
 *   })
 *
 *   return (
 *     <table>
 *       <thead>
 *         {table.getHeaderGroups().map(headerGroup => (
 *           <tr key={headerGroup.id}>
 *             {headerGroup.headers.map(header => (
 *               <th key={header.id}>
 *                 {flexRender(header.column.columnDef.header, header.getContext())}
 *               </th>
 *             ))}
 *           </tr>
 *         ))}
 *       </thead>
 *       <tbody>
 *         {table.getRowModel().rows.map(row => (
 *           <tr key={row.id}>
 *             {row.getVisibleCells().map(cell => (
 *               <td key={cell.id}>
 *                 {flexRender(cell.column.columnDef.cell, cell.getContext())}
 *               </td>
 *             ))}
 *           </tr>
 *         ))}
 *       </tbody>
 *     </table>
 *   )
 * }
 * ```
 */
export function useDataTable<TData>(options: UseDataTableOptions<TData>) {
	const {
		data,
		columns,
		initialSorting = [],
		initialPagination = { pageIndex: 0, pageSize: 10 },
		enableRowSelection = false,
		enableMultiRowSelection = true,
		enableColumnVisibility = false,
		pageSizeOptions = [10, 20, 30, 50, 100],
		getRowId,
	} = options

	// Table state
	const [sorting, setSorting] = useState<SortingState>(initialSorting)
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
	const [pagination, setPagination] = useState<PaginationState>(initialPagination)
	const [globalFilter, setGlobalFilter] = useState('')

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnFilters,
			columnVisibility: enableColumnVisibility ? columnVisibility : undefined,
			rowSelection: enableRowSelection ? rowSelection : undefined,
			pagination,
			globalFilter,
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: enableColumnVisibility ? setColumnVisibility : undefined,
		onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
		onPaginationChange: setPagination,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		enableRowSelection,
		enableMultiRowSelection,
		getRowId,
	})

	// Computed values
	const selectedRows = useMemo(() => {
		if (!enableRowSelection) return []
		return table.getFilteredSelectedRowModel().rows.map((row) => row.original)
	}, [table, enableRowSelection])

	const pageCount = table.getPageCount()
	const currentPage = table.getState().pagination.pageIndex + 1
	const totalRows = table.getFilteredRowModel().rows.length

	return {
		table,
		// State
		sorting,
		columnFilters,
		columnVisibility,
		rowSelection,
		pagination,
		globalFilter,
		// Setters
		setSorting,
		setColumnFilters,
		setColumnVisibility,
		setRowSelection,
		setPagination,
		setGlobalFilter,
		// Computed
		selectedRows,
		pageCount,
		currentPage,
		totalRows,
		pageSizeOptions,
	}
}

/**
 * Server-side pagination table hook
 * For use with TanStack Query's pagination
 */
export interface UseServerTableOptions<TData> {
	/** Data to display */
	data: TData[]
	/** Total row count from server */
	totalRowCount: number
	/** Column definitions */
	columns: ColumnDef<TData, unknown>[]
	/** Current page index (0-based) */
	pageIndex: number
	/** Page size */
	pageSize: number
	/** Callback when pagination changes */
	onPaginationChange: (pagination: PaginationState) => void
	/** Initial sorting state */
	initialSorting?: SortingState
	/** Callback when sorting changes */
	onSortingChange?: (sorting: SortingState) => void
	/** Get row ID for selection */
	getRowId?: (row: TData) => string
}

export function useServerTable<TData>(options: UseServerTableOptions<TData>) {
	const {
		data,
		totalRowCount,
		columns,
		pageIndex,
		pageSize,
		onPaginationChange,
		initialSorting = [],
		onSortingChange,
		getRowId,
	} = options

	const [sorting, setSorting] = useState<SortingState>(initialSorting)

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			pagination: { pageIndex, pageSize },
		},
		onSortingChange: (updater) => {
			const newSorting = typeof updater === 'function' ? updater(sorting) : updater
			setSorting(newSorting)
			onSortingChange?.(newSorting)
		},
		onPaginationChange: (updater) => {
			const current = { pageIndex, pageSize }
			const newPagination = typeof updater === 'function' ? updater(current) : updater
			onPaginationChange(newPagination)
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		manualPagination: true,
		manualSorting: !!onSortingChange,
		pageCount: Math.ceil(totalRowCount / pageSize),
		getRowId,
	})

	return {
		table,
		sorting,
		pageCount: Math.ceil(totalRowCount / pageSize),
		currentPage: pageIndex + 1,
		totalRows: totalRowCount,
	}
}

/**
 * Column helper for creating type-safe column definitions
 * Re-exports the built-in createColumnHelper from TanStack Table
 */
export { createColumnHelper } from '@tanstack/react-table'
