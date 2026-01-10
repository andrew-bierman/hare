import { generatePrefixedId } from '@hare/app/shared'
import {
	useDeleteToolMutation,
	useTestExistingToolMutation,
	useToolQuery,
	useUpdateToolMutation,
} from '@hare/app/shared/api'
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
} from '@hare/ui/components/dialog'
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
import { Textarea } from '@hare/ui/components/textarea'
import { useNavigate } from '@tanstack/react-router'
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Globe,
	Loader2,
	Play,
	Plus,
	Trash2,
} from 'lucide-react'
import { type ChangeEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'

// Local types for tool configuration
type HttpToolConfig = {
	url: string
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
	headers?: Record<string, string>
	body?: string
	bodyType?: 'json' | 'form' | 'text'
	timeout?: number
	responseMapping?: { path: string }
	[key: string]: unknown
}

type InputSchemaProperty = {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object'
	description?: string
	enum?: string[]
	default?: unknown
	required?: boolean
}

type InputSchema = {
	type: 'object'
	properties: Record<string, InputSchemaProperty>
	required?: string[]
}

interface ToolTestResult {
	success: boolean
	duration?: number
	result?: unknown
	error?: string
	status?: number
	statusText?: string
	data?: unknown
	requestDetails?: {
		url: string
		method: string
		headers?: Record<string, string>
		body?: string
	}
}

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object'

interface SchemaField {
	id: string
	name: string
	type: FieldType
	description: string
	required: boolean
	defaultValue: string
	enumValues: string
}

export interface ToolDetailPageProps {
	toolId: string
	toolsListPath?: string
}

function generateFieldId() {
	return generatePrefixedId('field')
}

function LoadingSkeleton() {
	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center gap-4">
				<Skeleton className="h-10 w-10" />
				<div className="space-y-2">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-4 w-96" />
				</div>
			</div>
			<div className="grid gap-4 lg:grid-cols-3">
				<div className="lg:col-span-2 space-y-4">
					<Skeleton className="h-64 w-full" />
					<Skeleton className="h-96 w-full" />
				</div>
				<div className="space-y-4">
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		</div>
	)
}

export function ToolDetailPage({ toolId, toolsListPath = '/dashboard/tools' }: ToolDetailPageProps) {
	const navigate = useNavigate()

	const { data: tool, isLoading, error } = useToolQuery(toolId)
	const updateTool = useUpdateToolMutation()
	const deleteTool = useDeleteToolMutation()
	const testTool = useTestExistingToolMutation()

	// Tool metadata
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')

	// HTTP configuration
	const [url, setUrl] = useState('')
	const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET')
	const [headers, setHeaders] = useState<{ id: string; key: string; value: string }[]>([])
	const [body, setBody] = useState('')
	const [bodyType, setBodyType] = useState<'json' | 'form' | 'text'>('json')
	const [timeout, setTimeout] = useState(10000)
	const [responsePath, setResponsePath] = useState('')

	// Input schema fields
	const [fields, setFields] = useState<SchemaField[]>([])

	// Test panel
	const [testInput, setTestInput] = useState<Record<string, string>>({})
	const [testResult, setTestResult] = useState<ToolTestResult | null>(null)
	const [showRequestDetails, setShowRequestDetails] = useState(false)

	// Delete dialog
	const [isDeleteOpen, setIsDeleteOpen] = useState(false)

	// Track changes
	const [hasChanges, setHasChanges] = useState(false)

	// Initialize form with tool data
	useEffect(() => {
		if (tool) {
			setName(tool.name)
			setDescription(tool.description || '')

			// Parse HTTP config
			const config = tool.config as HttpToolConfig | undefined
			if (config) {
				setUrl(config.url || '')
				setMethod(config.method || 'GET')
				setBody(config.body || '')
				setBodyType(config.bodyType || 'json')
				setTimeout(config.timeout || 10000)
				setResponsePath(config.responseMapping?.path || '')

				// Parse headers
				if (config.headers) {
					const headerList = Object.entries(config.headers).map(([key, value]) => ({
						id: generateFieldId(),
						key,
						value,
					}))
					setHeaders(headerList)
				} else {
					setHeaders([])
				}
			}

			// Parse input schema
			const inputSchema = tool.inputSchema as InputSchema | undefined
			if (inputSchema?.properties) {
				const fieldList: SchemaField[] = Object.entries(inputSchema.properties).map(
					([fieldName, prop]) => ({
						id: generateFieldId(),
						name: fieldName,
						type: (prop.type as FieldType) || 'string',
						description: prop.description || '',
						required: inputSchema.required?.includes(fieldName) || false,
						defaultValue: prop.default !== undefined ? String(prop.default) : '',
						enumValues: prop.enum ? prop.enum.join(', ') : '',
					}),
				)
				setFields(fieldList)
			} else {
				setFields([])
			}
		}
	}, [tool])

	// Track changes
	useEffect(() => {
		if (tool) {
			const config = tool.config as HttpToolConfig | undefined
			const inputSchema = tool.inputSchema as InputSchema | undefined

			const configChanged =
				url !== (config?.url || '') ||
				method !== (config?.method || 'GET') ||
				body !== (config?.body || '') ||
				bodyType !== (config?.bodyType || 'json') ||
				timeout !== (config?.timeout || 10000) ||
				responsePath !== (config?.responseMapping?.path || '')

			const metaChanged = name !== tool.name || description !== (tool.description || '')

			// Simple header comparison
			const currentHeadersObj: Record<string, string> = {}
			for (const h of headers) {
				if (h.key.trim()) {
					currentHeadersObj[h.key.trim()] = h.value
				}
			}
			const headersChanged =
				JSON.stringify(currentHeadersObj) !== JSON.stringify(config?.headers || {})

			// Simple fields comparison
			const currentFieldNames = fields.map((f) => f.name).sort()
			const originalFieldNames = inputSchema?.properties
				? Object.keys(inputSchema.properties).sort()
				: []
			const fieldsChanged = JSON.stringify(currentFieldNames) !== JSON.stringify(originalFieldNames)

			setHasChanges(configChanged || metaChanged || headersChanged || fieldsChanged)
		}
	}, [tool, name, description, url, method, body, bodyType, timeout, responsePath, headers, fields])

	// Add a new header
	const addHeader = () => {
		setHeaders([...headers, { id: generateFieldId(), key: '', value: '' }])
	}

	// Remove a header
	const removeHeader = (id: string) => {
		setHeaders(headers.filter((h) => h.id !== id))
	}

	// Update a header
	const updateHeader = (id: string, field: 'key' | 'value', value: string) => {
		setHeaders(headers.map((h) => (h.id === id ? { ...h, [field]: value } : h)))
	}

	// Add a new input field
	const addField = () => {
		const newField: SchemaField = {
			id: generateFieldId(),
			name: '',
			type: 'string',
			description: '',
			required: false,
			defaultValue: '',
			enumValues: '',
		}
		setFields([...fields, newField])
	}

	// Remove a field
	const removeField = (id: string) => {
		setFields(fields.filter((f) => f.id !== id))
		const fieldToRemove = fields.find((f) => f.id === id)
		if (fieldToRemove?.name) {
			const newTestInput = { ...testInput }
			delete newTestInput[fieldToRemove.name]
			setTestInput(newTestInput)
		}
	}

	// Update a field
	const updateField = (id: string, updates: Partial<SchemaField>) => {
		setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
	}

	// Build HTTP config from form state
	const buildHttpConfig = (): HttpToolConfig => {
		const headersObject: Record<string, string> = {}
		for (const h of headers) {
			if (h.key.trim()) {
				headersObject[h.key.trim()] = h.value
			}
		}

		return {
			url,
			method,
			headers: Object.keys(headersObject).length > 0 ? headersObject : undefined,
			body: body.trim() || undefined,
			bodyType,
			timeout,
			responseMapping: responsePath ? { path: responsePath } : undefined,
		}
	}

	// Build input schema from fields
	const buildInputSchema = (): InputSchema | undefined => {
		if (fields.length === 0) return undefined

		const properties: Record<string, InputSchemaProperty> = {}
		const required: string[] = []

		for (const field of fields) {
			if (!field.name.trim()) continue

			const prop: InputSchemaProperty = {
				type: field.type,
				description: field.description || undefined,
				default: field.defaultValue ? parseDefaultValue(field.defaultValue, field.type) : undefined,
				enum: field.enumValues ? field.enumValues.split(',').map((v) => v.trim()) : undefined,
			}

			properties[field.name.trim()] = prop

			if (field.required) {
				required.push(field.name.trim())
			}
		}

		return {
			type: 'object',
			properties,
			required: required.length > 0 ? required : undefined,
		}
	}

	// Parse default value based on type
	const parseDefaultValue = (value: string, type: FieldType): unknown => {
		switch (type) {
			case 'number':
				return Number(value) || 0
			case 'boolean':
				return value.toLowerCase() === 'true'
			default:
				return value
		}
	}

	// Build test input from form state
	const buildTestInput = (): Record<string, unknown> => {
		const result: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(testInput)) {
			const field = fields.find((f) => f.name === key)
			if (field) {
				result[key] = parseDefaultValue(value, field.type)
			} else {
				result[key] = value
			}
		}
		return result
	}

	// Test the tool
	const handleTest = async () => {
		try {
			const testInputData = buildTestInput()
			const result = await testTool.mutateAsync({
				id: toolId,
				testInput: testInputData,
			})

			setTestResult(result)

			if (result.success) {
				toast.success(`Test passed (${result.duration}ms)`)
			} else {
				toast.error(result.error || 'Test failed')
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Test failed')
		}
	}

	// Save changes
	const handleSave = async () => {
		if (!name.trim()) {
			toast.error('Please enter a tool name')
			return
		}

		if (!url.trim()) {
			toast.error('Please enter a URL')
			return
		}

		try {
			const config = buildHttpConfig()
			const inputSchema = buildInputSchema()

			await updateTool.mutateAsync({
				id: toolId,
				name: name.trim(),
				description: description.trim() || undefined,
				config: config as unknown as Record<string, unknown>,
				inputSchema: inputSchema as unknown as Record<string, unknown>,
			})

			toast.success('Tool updated successfully')
			setHasChanges(false)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update tool')
		}
	}

	// Delete tool
	const handleDelete = async () => {
		try {
			await deleteTool.mutateAsync({ id: toolId })
			toast.success('Tool deleted')
			navigate({ to: toolsListPath })
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete tool')
		}
	}

	// Navigate back to tools list
	const handleBack = () => {
		navigate({ to: toolsListPath })
	}

	if (isLoading) {
		return <LoadingSkeleton />
	}

	if (error || !tool) {
		return (
			<div className="flex-1 p-8 pt-6">
				<Card className="p-6 text-center">
					<p className="text-destructive">{error?.message || 'Tool not found'}</p>
					<Button className="mt-4" onClick={handleBack}>
						Back to Tools
					</Button>
				</Card>
			</div>
		)
	}

	const isSystemTool = tool.isSystem

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" onClick={handleBack}>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<div>
						<div className="flex items-center gap-3">
							<h2 className="text-3xl font-bold tracking-tight">{tool.name}</h2>
							<Badge variant={isSystemTool ? 'secondary' : 'default'}>
								{isSystemTool ? 'System' : 'Custom'}
							</Badge>
							<Badge variant="outline">{tool.type}</Badge>
						</div>
						<p className="text-muted-foreground mt-2">
							{isSystemTool ? 'System tools cannot be edited' : 'Edit your custom HTTP tool'}
						</p>
					</div>
				</div>
				{!isSystemTool && (
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => setIsDeleteOpen(true)}>
							<Trash2 className="mr-2 h-4 w-4" />
							Delete
						</Button>
						<Button onClick={handleSave} disabled={updateTool.isPending || !hasChanges}>
							{updateTool.isPending ? 'Saving...' : 'Save Changes'}
						</Button>
					</div>
				)}
			</div>

			{isSystemTool ? (
				<Card>
					<CardHeader>
						<CardTitle>Tool Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label className="text-muted-foreground">Name</Label>
							<p className="font-medium">{tool.name}</p>
						</div>
						<div>
							<Label className="text-muted-foreground">Description</Label>
							<p className="font-medium">{tool.description || 'No description'}</p>
						</div>
						<div>
							<Label className="text-muted-foreground">Type</Label>
							<p className="font-medium capitalize">{tool.type}</p>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 lg:grid-cols-3">
					{/* Main configuration panel */}
					<div className="lg:col-span-2 space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Globe className="h-5 w-5" />
									Tool Details
								</CardTitle>
								<CardDescription>Basic information about your tool</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="name">Name *</Label>
									<Input
										id="name"
										placeholder="e.g., Weather API"
										value={name}
										onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="description">Description</Label>
									<Textarea
										id="description"
										placeholder="Describe what this tool does..."
										className="h-24"
										value={description}
										onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
											setDescription(e.target.value)
										}
									/>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>HTTP Configuration</CardTitle>
								<CardDescription>Configure the HTTP request</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex gap-2">
									<div className="w-32">
										<Label htmlFor="method">Method</Label>
										<Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
											<SelectTrigger id="method">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="GET">GET</SelectItem>
												<SelectItem value="POST">POST</SelectItem>
												<SelectItem value="PUT">PUT</SelectItem>
												<SelectItem value="PATCH">PATCH</SelectItem>
												<SelectItem value="DELETE">DELETE</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="flex-1">
										<Label htmlFor="url">URL *</Label>
										<Input
											id="url"
											placeholder="https://api.example.com/data?q={{query}}"
											value={url}
											onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
										/>
										<p className="text-xs text-muted-foreground mt-1">
											Use {'{{variable}}'} syntax to insert input values
										</p>
									</div>
								</div>

								{/* Headers */}
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<Label>Headers</Label>
										<Button variant="outline" size="sm" onClick={addHeader}>
											<Plus className="h-3 w-3 mr-1" />
											Add
										</Button>
									</div>
									{headers.length > 0 && (
										<div className="space-y-2">
											{headers.map((header) => (
												<div key={header.id} className="flex gap-2">
													<Input
														placeholder="Header name"
														value={header.key}
														onChange={(e: ChangeEvent<HTMLInputElement>) =>
															updateHeader(header.id, 'key', e.target.value)
														}
														className="flex-1"
													/>
													<Input
														placeholder="Value"
														value={header.value}
														onChange={(e: ChangeEvent<HTMLInputElement>) =>
															updateHeader(header.id, 'value', e.target.value)
														}
														className="flex-1"
													/>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => removeHeader(header.id)}
														className="shrink-0"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
										</div>
									)}
								</div>

								{/* Body (for non-GET methods) */}
								{method !== 'GET' && (
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<Label htmlFor="body">Request Body</Label>
											<Select
												value={bodyType}
												onValueChange={(v) => setBodyType(v as typeof bodyType)}
											>
												<SelectTrigger className="w-24">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="json">JSON</SelectItem>
													<SelectItem value="form">Form</SelectItem>
													<SelectItem value="text">Text</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<Textarea
											id="body"
											placeholder={
												bodyType === 'json'
													? '{"key": "{{variable}}"}'
													: bodyType === 'form'
														? 'key={{variable}}'
														: 'Plain text body...'
											}
											className="font-mono text-sm h-32"
											value={body}
											onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
										/>
									</div>
								)}

								{/* Response Mapping */}
								<div className="space-y-2">
									<Label htmlFor="responsePath">Response Path (optional)</Label>
									<Input
										id="responsePath"
										placeholder="e.g., data.results"
										value={responsePath}
										onChange={(e: ChangeEvent<HTMLInputElement>) => setResponsePath(e.target.value)}
									/>
									<p className="text-xs text-muted-foreground">
										Extract a specific path from the response JSON
									</p>
								</div>

								{/* Timeout */}
								<div className="space-y-2">
									<Label htmlFor="timeout">Timeout (ms)</Label>
									<Input
										id="timeout"
										type="number"
										min={1000}
										max={30000}
										value={timeout}
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
											setTimeout(Number(e.target.value))
										}
									/>
								</div>
							</CardContent>
						</Card>

						{/* Input Schema Builder */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle>Input Parameters</CardTitle>
										<CardDescription>Define the inputs your tool accepts</CardDescription>
									</div>
									<Button variant="outline" onClick={addField}>
										<Plus className="h-4 w-4 mr-2" />
										Add Parameter
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{fields.length === 0 ? (
									<div className="text-center py-8 text-muted-foreground">
										<p>No parameters defined yet.</p>
										<p className="text-sm">Add parameters to make your tool dynamic.</p>
									</div>
								) : (
									<div className="space-y-4">
										{fields.map((field) => (
											<div key={field.id} className="border rounded-lg p-4 space-y-3 relative">
												<Button
													variant="ghost"
													size="icon"
													className="absolute top-2 right-2"
													onClick={() => removeField(field.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>

												<div className="grid grid-cols-2 gap-3 pr-10">
													<div className="space-y-1">
														<Label>Parameter Name</Label>
														<Input
															placeholder="e.g., query"
															value={field.name}
															onChange={(e: ChangeEvent<HTMLInputElement>) =>
																updateField(field.id, { name: e.target.value })
															}
														/>
													</div>
													<div className="space-y-1">
														<Label>Type</Label>
														<Select
															value={field.type}
															onValueChange={(v) => updateField(field.id, { type: v as FieldType })}
														>
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="string">String</SelectItem>
																<SelectItem value="number">Number</SelectItem>
																<SelectItem value="boolean">Boolean</SelectItem>
																<SelectItem value="array">Array</SelectItem>
																<SelectItem value="object">Object</SelectItem>
															</SelectContent>
														</Select>
													</div>
												</div>

												<div className="space-y-1">
													<Label>Description</Label>
													<Input
														placeholder="Describe this parameter..."
														value={field.description}
														onChange={(e: ChangeEvent<HTMLInputElement>) =>
															updateField(field.id, { description: e.target.value })
														}
													/>
												</div>

												<div className="grid grid-cols-2 gap-3">
													<div className="space-y-1">
														<Label>Default Value</Label>
														<Input
															placeholder="Optional default"
															value={field.defaultValue}
															onChange={(e: ChangeEvent<HTMLInputElement>) =>
																updateField(field.id, { defaultValue: e.target.value })
															}
														/>
													</div>
													<div className="space-y-1">
														<Label>Enum Values (comma-separated)</Label>
														<Input
															placeholder="e.g., small, medium, large"
															value={field.enumValues}
															onChange={(e: ChangeEvent<HTMLInputElement>) =>
																updateField(field.id, { enumValues: e.target.value })
															}
														/>
													</div>
												</div>

												<div className="flex items-center gap-2">
													<input
														type="checkbox"
														id={`required-${field.id}`}
														checked={field.required}
														onChange={(e) => updateField(field.id, { required: e.target.checked })}
														className="rounded border-gray-300"
													/>
													<Label htmlFor={`required-${field.id}`} className="text-sm font-normal">
														Required parameter
													</Label>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Test Panel */}
					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Play className="h-5 w-5" />
									Test Tool
								</CardTitle>
								<CardDescription>Test your tool configuration</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Test input fields */}
								{fields.length > 0 && (
									<div className="space-y-3">
										<Label>Test Inputs</Label>
										{fields.map((field) =>
											field.name ? (
												<div key={field.id} className="space-y-1">
													<Label className="text-xs">
														{field.name}
														{field.required && <span className="text-destructive"> *</span>}
													</Label>
													<Input
														placeholder={field.description || `Enter ${field.name}`}
														value={testInput[field.name] || ''}
														onChange={(e: ChangeEvent<HTMLInputElement>) =>
															setTestInput({ ...testInput, [field.name]: e.target.value })
														}
													/>
												</div>
											) : null,
										)}
									</div>
								)}

								<Button
									variant="secondary"
									className="w-full"
									onClick={handleTest}
									disabled={testTool.isPending}
								>
									{testTool.isPending ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											Testing...
										</>
									) : (
										<>
											<Play className="h-4 w-4 mr-2" />
											Run Test
										</>
									)}
								</Button>

								{/* Test Results */}
								{testResult && (
									<div className="space-y-3">
										<div className="flex items-center gap-2">
											{testResult.success ? (
												<CheckCircle2 className="h-5 w-5 text-green-500" />
											) : (
												<AlertCircle className="h-5 w-5 text-destructive" />
											)}
											<span className={testResult.success ? 'text-green-500' : 'text-destructive'}>
												{testResult.success ? 'Success' : 'Failed'}
											</span>
											<Badge variant="outline" className="ml-auto">
												{testResult.duration}ms
											</Badge>
										</div>

										{testResult.status && (
											<div className="text-sm">
												<span className="text-muted-foreground">Status:</span>{' '}
												<Badge variant={testResult.status < 400 ? 'default' : 'destructive'}>
													{testResult.status} {testResult.statusText}
												</Badge>
											</div>
										)}

										{testResult.error && (
											<div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
												{testResult.error}
											</div>
										)}

										{testResult.data !== undefined && (
											<div className="space-y-1">
												<Label className="text-xs">Response Data</Label>
												<pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
													{JSON.stringify(testResult.data, null, 2)}
												</pre>
											</div>
										)}

										{/* Request Details (collapsible) */}
										<div>
											<button
												type="button"
												className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
												onClick={() => setShowRequestDetails(!showRequestDetails)}
											>
												{showRequestDetails ? (
													<ChevronUp className="h-4 w-4" />
												) : (
													<ChevronDown className="h-4 w-4" />
												)}
												Request Details
											</button>
											{showRequestDetails && testResult.requestDetails && (
												<div className="mt-2 space-y-2 text-xs">
													<div>
														<span className="text-muted-foreground">URL:</span>{' '}
														{testResult.requestDetails.url}
													</div>
													<div>
														<span className="text-muted-foreground">Method:</span>{' '}
														{testResult.requestDetails.method}
													</div>
													{testResult.requestDetails.headers && (
														<div>
															<span className="text-muted-foreground">Headers:</span>
															<pre className="bg-muted p-1 rounded mt-1">
																{JSON.stringify(testResult.requestDetails.headers, null, 2)}
															</pre>
														</div>
													)}
													{testResult.requestDetails.body && (
														<div>
															<span className="text-muted-foreground">Body:</span>
															<pre className="bg-muted p-1 rounded mt-1">
																{testResult.requestDetails.body}
															</pre>
														</div>
													)}
												</div>
											)}
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Tips</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm text-muted-foreground">
								<p>
									Use {'{{variable}}'} syntax in URLs, headers, and body to insert dynamic values.
								</p>
								<p>Define input parameters to make your tool reusable with different inputs.</p>
								<p>Test your tool to verify it works before saving.</p>
							</CardContent>
						</Card>
					</div>
				</div>
			)}

			{/* Delete Dialog */}
			<Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Tool</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{tool.name}"? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={deleteTool.isPending}>
							{deleteTool.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
