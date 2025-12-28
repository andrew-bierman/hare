import { createFileRoute, Link } from '@tanstack/react-router'
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Textarea } from '@workspace/ui/components/textarea'
import {
	ArrowLeft,
	Bot,
	Download,
	FileJson,
	FileText,
	Loader2,
	MessageSquare,
	Send,
	Sparkles,
	Trash2,
	User,
	Wrench,
} from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ToolCallList } from 'web-app/components/chat/tool-call-list'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { getModelName } from 'web-app/config'
import { useAgent, useChat } from 'web-app/lib/api/hooks'

export const Route = createFileRoute('/_dashboard/dashboard/agents/$id/playground')({
	component: PlaygroundPage,
})

function LoadingSkeleton() {
	return (
		<div className="flex flex-col h-full">
			<div className="border-b p-4">
				<div className="flex items-center gap-4">
					<Skeleton className="h-9 w-9 rounded-lg" />
					<div className="space-y-2">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>
			</div>
			<div className="flex-1 p-4">
				<div className="space-y-4">
					<Skeleton className="h-20 w-3/4" />
					<Skeleton className="h-20 w-2/3 ml-auto" />
				</div>
			</div>
		</div>
	)
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center h-full p-8 text-center">
			<div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 mb-4">
				<MessageSquare className="h-8 w-8 text-primary" />
			</div>
			<h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
			<p className="text-muted-foreground text-sm max-w-md mb-6">
				Send a message to begin chatting with this agent. You can ask questions, request help with
				tasks, or explore what tools are available.
			</p>
			<div className="flex flex-wrap gap-2 justify-center max-w-md">
				{['What can you help me with?', 'Show me your capabilities', 'Hello!'].map((prompt) => (
					<Badge
						key={prompt}
						variant="secondary"
						className="cursor-pointer hover:bg-secondary/80 transition-colors px-3 py-1.5"
					>
						{prompt}
					</Badge>
				))}
			</div>
		</div>
	)
}

function PlaygroundPage() {
	const { id: agentId } = Route.useParams()
	const { activeWorkspace } = useWorkspace()
	const {
		data: agent,
		isLoading: agentLoading,
		error: agentError,
	} = useAgent(agentId, activeWorkspace?.id)
	const {
		messages,
		isStreaming,
		error: chatError,
		sessionId,
		sendMessage,
		clearMessages,
	} = useChat(agentId)

	const [input, setInput] = useState('')
	const scrollRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	// Auto-scroll to bottom when new messages arrive
	const messageCount = messages.length
	useEffect(() => {
		if (scrollRef.current && messageCount > 0) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight
		}
	}, [messageCount])

	// Auto-resize textarea when input changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional - resize textarea on input change
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
		}
	}, [input])

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		const trimmedInput = input.trim()
		if (!trimmedInput || isStreaming) return

		setInput('')
		await sendMessage(trimmedInput)
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit(e)
		}
	}

	const handleExport = useCallback(
		async (options: { format: 'json' | 'markdown'; includeMetadata?: boolean }) => {
			if (!sessionId) {
				toast.error('No conversation to export')
				return
			}

			try {
				const params = new URLSearchParams({
					format: options.format,
					...(options.includeMetadata && { includeMetadata: 'true' }),
				})

				const response = await fetch(
					`/api/chat/conversations/${sessionId}/export?${params.toString()}`,
				)

				if (!response.ok) {
					const errorData = (await response.json().catch(() => ({ error: 'Export failed' }))) as {
						error?: string
					}
					throw new Error(errorData.error || 'Export failed')
				}

				const contentType = response.headers.get('content-type') || ''
				const isMarkdown = contentType.includes('text/markdown')
				const filename = `conversation-${sessionId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.${isMarkdown ? 'md' : 'json'}`

				const blob = await response.blob()
				const url = URL.createObjectURL(blob)
				const a = document.createElement('a')
				a.href = url
				a.download = filename
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				URL.revokeObjectURL(url)

				toast.success(`Conversation exported as ${isMarkdown ? 'Markdown' : 'JSON'}`)
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Failed to export conversation')
			}
		},
		[sessionId],
	)


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

	if (agent.status !== 'deployed') {
		return (
			<div className="flex flex-col items-center justify-center h-full p-8">
				<Card className="max-w-md w-full">
					<CardContent className="pt-6 text-center">
						<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 mx-auto mb-4">
							<Bot className="h-7 w-7 text-amber-600" />
						</div>
						<h3 className="text-lg font-semibold mb-2">Agent Not Deployed</h3>
						<p className="text-muted-foreground text-sm mb-6">
							This agent needs to be deployed before you can test it in the playground.
						</p>
						<Link to="/dashboard/agents/$id" params={{ id: agentId }}>
							<Button>Go to Agent Settings</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="flex h-full">
			{/* Main Chat Area */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Header */}
				<div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<div className="flex items-center justify-between p-4">
						<div className="flex items-center gap-3">
							<Link to="/dashboard/agents/$id" params={{ id: agentId }}>
								<Button variant="ghost" size="icon" className="h-9 w-9">
									<ArrowLeft className="h-4 w-4" />
								</Button>
							</Link>
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
								<Bot className="h-5 w-5 text-primary-foreground" />
							</div>
							<div>
								<h1 className="font-semibold">{agent.name}</h1>
								<p className="text-xs text-muted-foreground">{getModelName(agent.model)}</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										disabled={!sessionId || isStreaming}
										className="gap-1.5"
									>
										<Download className="h-3.5 w-3.5" />
										Export
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => handleExport({ format: 'json' })}>
										<FileJson className="mr-2 h-4 w-4" />
										Export as JSON
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => handleExport({ format: 'markdown' })}>
										<FileText className="mr-2 h-4 w-4" />
										Export as Markdown
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => handleExport({ format: 'json', includeMetadata: true })}
									>
										<FileJson className="mr-2 h-4 w-4" />
										Export with metadata (JSON)
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
							<Button
								variant="outline"
								size="sm"
								onClick={clearMessages}
								disabled={messages.length === 0 || isStreaming}
								className="gap-1.5"
							>
								<Trash2 className="h-3.5 w-3.5" />
								Clear
							</Button>
						</div>
					</div>
				</div>

				{/* Messages */}
				<ScrollArea className="flex-1" ref={scrollRef}>
					{messages.length === 0 ? (
						<EmptyState />
					) : (
						<div className="p-4 space-y-4">
							{messages.map((message) => (
								<div
									key={message.id}
									className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
								>
									<Avatar className="h-8 w-8 flex-shrink-0">
										<AvatarFallback
											className={
												message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
											}
										>
											{message.role === 'user' ? (
												<User className="h-4 w-4" />
											) : (
												<Bot className="h-4 w-4" />
											)}
										</AvatarFallback>
									</Avatar>
									<div
										className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}
									>
										<div
											className={`inline-block rounded-lg px-4 py-2 ${
												message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
											}`}
										>
											<p className="text-sm whitespace-pre-wrap">{message.content}</p>
										</div>
										{/* Tool Calls */}
										{message.role === 'assistant' &&
											message.toolCalls &&
											message.toolCalls.length > 0 && (
												<ToolCallList toolCalls={message.toolCalls} />
											)}
									</div>
								</div>
							))}

							{/* Streaming Indicator */}
							{isStreaming &&
								messages[messages.length - 1]?.role === 'assistant' &&
								!messages[messages.length - 1]?.content && (
									<div className="flex gap-3">
										<Avatar className="h-8 w-8 flex-shrink-0">
											<AvatarFallback className="bg-muted">
												<Bot className="h-4 w-4" />
											</AvatarFallback>
										</Avatar>
										<div className="flex-1">
											<div className="inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
												<Loader2 className="h-4 w-4 animate-spin" />
												<span className="text-sm text-muted-foreground">Thinking...</span>
											</div>
										</div>
									</div>
								)}

							{/* Error Display */}
							{chatError && (
								<div className="flex justify-center">
									<div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2 text-sm">
										{chatError}
									</div>
								</div>
							)}
						</div>
					)}
				</ScrollArea>

				{/* Input Area */}
				<div className="border-t bg-background p-4">
					<form onSubmit={handleSubmit} className="flex gap-3">
						<Textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Type a message... (Shift+Enter for new line)"
							className="min-h-[44px] max-h-[200px] resize-none"
							disabled={isStreaming}
							rows={1}
						/>
						<Button
							type="submit"
							size="icon"
							className="h-11 w-11 flex-shrink-0"
							disabled={!input.trim() || isStreaming}
						>
							{isStreaming ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Send className="h-4 w-4" />
							)}
						</Button>
					</form>
				</div>
			</div>

			{/* Sidebar */}
			<div className="hidden lg:flex w-72 border-l flex-col bg-muted/30">
				<div className="p-4 border-b">
					<h2 className="font-semibold text-sm">Agent Info</h2>
				</div>
				<ScrollArea className="flex-1">
					<div className="p-4 space-y-4">
						{/* Model Info */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
									<Sparkles className="h-3.5 w-3.5" />
									Model
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-sm font-medium">{getModelName(agent.model)}</p>
							</CardContent>
						</Card>

						{/* Tools Info */}
						{agent.toolIds && agent.toolIds.length > 0 && (
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
										<Wrench className="h-3.5 w-3.5" />
										Tools ({agent.toolIds.length})
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-0">
									<div className="flex flex-wrap gap-1">
										{agent.toolIds.slice(0, 5).map((toolId) => (
											<Badge key={toolId} variant="secondary" className="text-xs">
												{toolId.slice(0, 8)}...
											</Badge>
										))}
										{agent.toolIds.length > 5 && (
											<Badge variant="outline" className="text-xs">
												+{agent.toolIds.length - 5} more
											</Badge>
										)}
									</div>
								</CardContent>
							</Card>
						)}

						{/* Description */}
						{agent.description && (
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-xs font-medium text-muted-foreground">
										Description
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-0">
									<p className="text-sm text-muted-foreground">{agent.description}</p>
								</CardContent>
							</Card>
						)}
					</div>
				</ScrollArea>
			</div>
		</div>
	)
}
