/**
 * Agent Form Component
 *
 * TanStack Form-based agent creation/editing form with Zod validation.
 */

import { useForm } from '@tanstack/react-form'
import { Button } from '@workspace/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@workspace/ui/components/select'
import { Textarea } from '@workspace/ui/components/textarea'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { AI_MODELS, type AIModel } from '../../config'

/**
 * Form validation schema
 */
export const agentFormSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
	description: z.string().max(500, 'Description must be at most 500 characters').default(''),
	model: z.string().min(1, 'Model is required'),
	instructions: z
		.string()
		.min(1, 'Instructions are required')
		.max(10000, 'Instructions must be at most 10000 characters'),
	toolIds: z.array(z.string()).default([]),
})

export type AgentFormValues = z.infer<typeof agentFormSchema>

export interface AgentFormProps {
	/** Initial values for editing an existing agent */
	defaultValues?: Partial<AgentFormValues>
	/** Callback when form is submitted */
	onSubmit: (values: AgentFormValues) => Promise<void>
	/** Whether the form is in a pending/submitting state */
	isPending?: boolean
	/** Form mode - affects button text and layout */
	mode?: 'create' | 'edit'
}

/**
 * Reusable agent form component using TanStack Form
 *
 * @example
 * ```tsx
 * function CreateAgentPage() {
 *   const createAgent = useCreateAgent(workspaceId)
 *
 *   return (
 *     <AgentForm
 *       mode="create"
 *       isPending={createAgent.isPending}
 *       onSubmit={async (values) => {
 *         await createAgent.mutateAsync(values)
 *         navigate('/dashboard/agents')
 *       }}
 *     />
 *   )
 * }
 * ```
 */
export function AgentForm({
	defaultValues,
	onSubmit,
	isPending = false,
	mode = 'create',
}: AgentFormProps) {
	const form = useForm({
		defaultValues: {
			name: defaultValues?.name ?? '',
			description: defaultValues?.description ?? '',
			model: defaultValues?.model ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			instructions: defaultValues?.instructions ?? '',
			toolIds: defaultValues?.toolIds ?? [],
		},
		onSubmit: async ({ value }) => {
			// Validate with Zod before submitting
			const result = agentFormSchema.safeParse(value)
			if (!result.success) {
				throw new Error(result.error.issues[0]?.message ?? 'Validation failed')
			}
			await onSubmit(result.data)
		},
	})

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
		>
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
						<CardDescription>Configure your agent's identity and purpose</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Name Field */}
						<form.Field name="name">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>
										Agent Name <span className="text-destructive">*</span>
									</Label>
									<Input
										id={field.name}
										placeholder="e.g., Customer Support Agent"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										disabled={isPending}
										aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
									/>
									{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
										<p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
									)}
								</div>
							)}
						</form.Field>

						{/* Description Field */}
						<form.Field name="description">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Description</Label>
									<Textarea
										id={field.name}
										placeholder="Describe what this agent does..."
										className="h-24"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										disabled={isPending}
									/>
									{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
										<p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
									)}
								</div>
							)}
						</form.Field>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Configuration</CardTitle>
						<CardDescription>Set up your agent's behavior and capabilities</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Model Field */}
						<form.Field name="model">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>
										Model <span className="text-destructive">*</span>
									</Label>
									<Select
										value={field.state.value}
										onValueChange={field.handleChange}
										disabled={isPending}
									>
										<SelectTrigger id={field.name}>
											<SelectValue placeholder="Select a model" />
										</SelectTrigger>
										<SelectContent>
											{AI_MODELS.map((m: AIModel) => (
												<SelectItem key={m.id} value={m.id}>
													<div className="flex flex-col">
														<span>{m.name}</span>
														<span className="text-xs text-muted-foreground">{m.description}</span>
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
										<p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
									)}
								</div>
							)}
						</form.Field>

						{/* Instructions Field */}
						<form.Field name="instructions">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>
										System Prompt <span className="text-destructive">*</span>
									</Label>
									<Textarea
										id={field.name}
										placeholder="You are a helpful assistant that..."
										className="h-48 font-mono text-sm"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										disabled={isPending}
									/>
									<p className="text-xs text-muted-foreground">
										Define how your agent should behave. Use Markdown formatting.
									</p>
									{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
										<p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
									)}
								</div>
							)}
						</form.Field>
					</CardContent>
				</Card>

				{/* Form Actions */}
				<form.Subscribe
					selector={(state) => ({
						canSubmit: state.canSubmit,
						isSubmitting: state.isSubmitting,
					})}
				>
					{({ canSubmit, isSubmitting }) => (
						<div className="flex justify-end gap-4">
							<Button type="submit" disabled={!canSubmit || isPending || isSubmitting}>
								{isPending || isSubmitting ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										{mode === 'create' ? 'Creating...' : 'Saving...'}
									</>
								) : mode === 'create' ? (
									'Create Agent'
								) : (
									'Save Changes'
								)}
							</Button>
						</div>
					)}
				</form.Subscribe>
			</div>
		</form>
	)
}
