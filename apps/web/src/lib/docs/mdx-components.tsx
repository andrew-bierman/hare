/**
 * MDX Components for documentation
 *
 * This module provides custom MDX components for documentation pages.
 * The TypeTable component is used to display auto-generated type documentation
 * from TypeScript files via the fumadocs-typescript remarkAutoTypeTable plugin.
 */

import type { ComponentType } from 'react'
import { TypeTable } from 'fumadocs-ui/components/type-table'

/**
 * Get MDX components for documentation pages.
 *
 * Includes:
 * - TypeTable: Auto-generated type documentation from fumadocs-typescript
 */
export function getMDXComponents(): Record<string, ComponentType<Record<string, unknown>>> {
	return {
		// TypeTable is output by remarkAutoTypeTable which transforms <AutoTypeTable> at build time
		TypeTable: TypeTable as ComponentType<Record<string, unknown>>,
	}
}
