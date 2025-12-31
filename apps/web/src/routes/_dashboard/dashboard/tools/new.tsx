import { useWorkspace } from '@hare/app'
import {
	type HttpToolConfig,
	type InputSchema,
	type InputSchemaProperty,
	type ToolTestResult,
	useCreateToolMutation,
	useTestToolMutation,
} from '@hare/app/shared/api'
import { generatePrefixedId } from '@hare/app/shared'
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
import { Textarea } from '@hare/ui/components/textarea'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Globe,
	Loader2,
	Play,
	Plus,
	Trash2,
} from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_dashboard/dashboard/tools/new')({
	component: NewToolPage,
})

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

function generateFieldId() {
	return generatePrefixedId('field')
}

function NewToolPage() {
	const navigate = useNavigate()
	const { activeWorkspace } = useWorkspace()
	const createTool = useCreateToolMutation(activeWorkspace?.id)
	const testTool = useTestToolMutation(activeWorkspace?.id)

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
		// Also remove from test input
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
		if (!url.trim()) {
			toast.error('Please enter a URL')
			return
		}

		try {
			const config = buildHttpConfig()
			const inputSchema = buildInputSchema()
			const testInputData = buildTestInput()

			const result = await testTool.mutateAsync({
				config,
				inputSchema,
				testInput: testInputData,
			})

			setTestResult(result)

			if (result.success) {
				toast.success(`Test passed (${result.duration}ms)`)
			} else {
				toast.error(result.error || 'Test failed')
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Test failed')
		}
	}

	// Create the tool
	const handleCreate = async () => {
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

			await createTool.mutateAsync({
				name: name.trim(),
				description: description.trim() || undefined,
				type: 'http',
				config: config as unknown as Record<string, unknown>,
				inputSchema: inputSchema as unknown as Record<string, unknown>,
			})

			toast.success('Tool created successfully')
			navigate({ to: '/dashboard/tools' })
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create tool')
		}
	}

	const handleCancel = () => {
		navigate({ to: '/dashboard/tools' })
	}

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Create HTTP Tool</h2>
					<p className="text-muted-foreground mt-2">
						Create a custom HTTP tool to call external APIs
					</p>
				</div>
			</div>

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
									onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
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
													placeholder="Value (use {{variable}} for dynamic values)"
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

				{/* Test Panel & Actions */}
				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Actions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Button
								className="w-full"
								onClick={handleCreate}
								disabled={createTool.isPending || !name.trim() || !url.trim()}
							>
								{createTool.isPending ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Creating...
									</>
								) : (
									'Create Tool'
								)}
							</Button>
							<Button variant="outline" className="w-full" onClick={handleCancel}>
								Cancel
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Play className="h-5 w-5" />
								Test Tool
							</CardTitle>
							<CardDescription>Test your tool before saving</CardDescription>
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
								disabled={testTool.isPending || !url.trim()}
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
							<p>Response path lets you extract specific data from API responses.</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
