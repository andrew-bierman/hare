/**
 * TanStack Virtual Utilities
 *
 * Virtualization utilities for efficient rendering of large lists.
 *
 * @see https://tanstack.com/virtual/latest/docs/introduction
 */

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

/**
 * Options for creating a virtualized list
 */
export interface UseVirtualListOptions<T> {
	/** Data items to virtualize */
	items: T[]
	/** Estimated height of each item in pixels */
	estimateSize?: number
	/** Overscan count - how many items to render outside viewport */
	overscan?: number
	/** Gap between items in pixels */
	gap?: number
	/** Whether to enable horizontal scrolling */
	horizontal?: boolean
	/** Custom getItemKey function */
	getItemKey?: (index: number) => string | number
}

/**
 * Hook for creating a virtualized list
 *
 * @example
 * ```tsx
 * function MessageList({ messages }) {
 *   const { parentRef, virtualizer, virtualItems, totalSize } = useVirtualList({
 *     items: messages,
 *     estimateSize: 80,
 *     overscan: 5,
 *   })
 *
 *   return (
 *     <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
 *       <div style={{ height: totalSize, position: 'relative' }}>
 *         {virtualItems.map((virtualItem) => (
 *           <div
 *             key={virtualItem.key}
 *             style={{
 *               position: 'absolute',
 *               top: virtualItem.start,
 *               height: virtualItem.size,
 *             }}
 *           >
 *             {messages[virtualItem.index].content}
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useVirtualList<T>(options: UseVirtualListOptions<T>) {
	const {
		items,
		estimateSize = 50,
		overscan = 5,
		gap = 0,
		horizontal = false,
		getItemKey,
	} = options

	const parentRef = useRef<HTMLDivElement>(null)

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => estimateSize,
		overscan,
		gap,
		horizontal,
		getItemKey: getItemKey ?? ((index) => index),
	})

	const virtualItems = virtualizer.getVirtualItems()
	const totalSize = virtualizer.getTotalSize()

	return {
		parentRef,
		virtualizer,
		virtualItems,
		totalSize,
		items,
	}
}

/**
 * Hook for creating a window-based virtualized list (no scroll container)
 */
export function useWindowVirtualList<T>(options: Omit<UseVirtualListOptions<T>, 'parentRef'>) {
	const { items, estimateSize = 50, overscan = 5, getItemKey } = options

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => (typeof window !== 'undefined' ? window : null) as unknown as Element,
		estimateSize: () => estimateSize,
		overscan,
		getItemKey: getItemKey ?? ((index) => index),
	})

	return {
		virtualizer,
		virtualItems: virtualizer.getVirtualItems(),
		totalSize: virtualizer.getTotalSize(),
		items,
	}
}

/**
 * Hook for infinite scrolling with virtualization
 */
export interface UseInfiniteVirtualListOptions<T> extends UseVirtualListOptions<T> {
	/** Whether there are more items to load */
	hasNextPage?: boolean
	/** Whether currently fetching next page */
	isFetchingNextPage?: boolean
	/** Function to fetch next page */
	fetchNextPage?: () => void
	/** Threshold for triggering next page fetch (items from end) */
	loadMoreThreshold?: number
}

export function useInfiniteVirtualList<T>(options: UseInfiniteVirtualListOptions<T>) {
	const {
		items,
		hasNextPage = false,
		isFetchingNextPage = false,
		fetchNextPage,
		loadMoreThreshold = 5,
		...virtualOptions
	} = options

	const parentRef = useRef<HTMLDivElement>(null)

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => virtualOptions.estimateSize ?? 50,
		overscan: virtualOptions.overscan ?? 5,
		getItemKey: virtualOptions.getItemKey ?? ((index) => index),
		onChange: (instance) => {
			const lastItem = instance.getVirtualItems().at(-1)
			if (!lastItem) return

			// Check if we should load more
			if (
				lastItem.index >= items.length - loadMoreThreshold &&
				hasNextPage &&
				!isFetchingNextPage &&
				fetchNextPage
			) {
				fetchNextPage()
			}
		},
	})

	return {
		parentRef,
		virtualizer,
		virtualItems: virtualizer.getVirtualItems(),
		totalSize: virtualizer.getTotalSize(),
		items,
		hasNextPage,
		isFetchingNextPage,
	}
}

/**
 * Scroll to a specific index
 */
export function scrollToIndex(
	virtualizer: ReturnType<typeof useVirtualizer>,
	index: number,
	options?: { align?: 'start' | 'center' | 'end'; behavior?: 'auto' | 'smooth' },
) {
	virtualizer.scrollToIndex(index, options)
}

/**
 * Scroll to the end of the list
 */
export function scrollToEnd(
	virtualizer: ReturnType<typeof useVirtualizer>,
	options?: { behavior?: 'auto' | 'smooth' },
) {
	const count = virtualizer.options.count
	if (count > 0) {
		virtualizer.scrollToIndex(count - 1, { align: 'end', ...options })
	}
}
