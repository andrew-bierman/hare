/**
 * TanStack Form Integration
 *
 * Type-safe form utilities built on TanStack Form with Zod validation.
 * Integrates with TanStack Query for mutations.
 *
 * @see https://tanstack.com/form/latest/docs/overview
 */

import { type FormApi, useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'

export type { FormApi }
/**
 * Re-export core form utilities
 */
export { useForm, zodValidator }

/**
 * Field error display helper
 */
export function getFieldError(field: {
	state: { meta: { errors?: string[] } }
}): string | undefined {
	return field.state.meta.errors?.[0]
}

/**
 * Check if a field has been touched and has errors
 */
export function shouldShowError(field: {
	state: { meta: { isTouched: boolean; errors?: string[] } }
}): boolean {
	return field.state.meta.isTouched && (field.state.meta.errors?.length ?? 0) > 0
}

/**
 * Form field component props helper
 */
export interface FieldProps {
	name: string
	value: unknown
	onChange: (value: unknown) => void
	onBlur: () => void
	disabled?: boolean
}

/**
 * Create field props from TanStack Form field
 */
export function getFieldProps<T>(field: {
	name: string
	state: { value: T }
	handleChange: (value: T) => void
	handleBlur: () => void
}): FieldProps {
	return {
		name: field.name,
		value: field.state.value,
		onChange: field.handleChange as (value: unknown) => void,
		onBlur: field.handleBlur,
	}
}
