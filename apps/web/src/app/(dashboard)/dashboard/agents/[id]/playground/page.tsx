'use client'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
	ArrowLeft,
	Bot,
	Clock,
	Info,
	Lightbulb,
	RotateCcw,
	Send,
	Settings,
	Sparkles,
	User,
	Wrench,
	Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { AVAILABLE_MODELS, useAgent, useChat } from 'web-app/lib/api/hooks'
import { ToolCallList } from 'web-app/components/chat/tool-call-list'

function LoadingSkeleton() {
	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="space-y-2">
				<Skeleton className="h-9 w-64" />
				<Skeleton className="h-5 w-96" />
			</div>
			<div className="grid gap-4 md:grid-cols-4 h-[calc(100vh-220px)]">
				<Skeleton className="md:col-span-3 h-full" />
				<Skeleton className="h-64" />
			</div>
		</div>
	)
}

export default function PlaygroundPage() {
	const params = useParams()
	const router = useRouter()
	const agentId = params.id as string

	const { activeWorkspace } = useWorkspace()
	const {
		data: agent,
		isLoading: agentLoading,
		error: agentError,
	} = useAgent(agentId, activeWorkspace?.id)
	const { messages, isStreaming, error: chatError, sendMessage, clearMessages } = useChat(agentId)

	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [])

	const handleSend = () => {
		const input = inputRef.current
		if (!input || !input.value.trim() || isStreaming) return

		sendMessage(input.value.trim())
		input.value = ''
	}

	const getModelName = (modelId: string) => {
		const model = AVAILABLE_MODELS.find((m) => m.id === modelId)
		return model?.name || modelId
	}

	if (agentLoading) {
		return <LoadingSkeleton />
	}

	if (agentError || !agent) {
		return (
			<div className="flex-1 p-8 pt-6">
				<Card className="max-w-md mx-auto border-destructive/50 bg-destructive/5">
					<CardContent className="pt-6 text-center">
						<div className="rounded-full bg-destructive/10 p-3 w-fit mx-auto mb-4">
							<Info className="h-6 w-6 text-destructive" />
						</div>
						<h3 className="font-semibold mb-2">Agent not found</h3>
						<p className="text-sm text-muted-foreground mb-4">
							{agentError?.message || 'The agent you are looking for does not exist.'}
						</p>
						<Button onClick={() => router.push('/dashboard/agents')}>Back to Agents</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (agent.status !== 'deployed') {
		return (
			<div className="flex-1 p-8 pt-6">
				<Card className="max-w-md mx-auto border-yellow-500/50 bg-yellow-500/5">
					<CardContent className="pt-6 text-center">
						<div className="rounded-full bg-yellow-500/10 p-3 w-fit mx-auto mb-4">
							<Bot className="h-6 w-6 text-yellow-600" />
						</div>
						<h3 className="font-semibold mb-2">Agent Not Deployed</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Deploy this agent before testing it in the playground.
						</p>
						<Button onClick={() => router.push(`/dashboard/agents/${agentId}`)}>
							<Settings className="mr-2 h-4 w-4" />
							Configure Agent
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	const suggestedPrompts = [
		'What can you help me with?',
		'Tell me about your capabilities',
		'How do you work?',
	]

	return (
		<div className="flex-1 flex flex-col p-8 pt-6 h-full">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link href={`/dashboard/agents/${agentId}`}>
						<Button variant="ghost" size="icon" className="rounded-full">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div className="flex items-center gap-3">
						<div className="rounded-xl bg-primary/10 p-2.5">
							<Bot className="h-6 w-6 text-primary" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-xl font-semibold">{agent.name}</h1>
								<Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
									<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
									Live
								</Badge>
							</div>
							<p className="text-sm text-muted-foreground">{getModelName(agent.model)}</p>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Link href={`/dashboard/agents/${agentId}`}>
						<Button variant="outline" size="sm" className="gap-1.5">
							<Settings className="h-4 w-4" />
							Settings
						</Button>
					</Link>
					<Button
						variant="outline"
						size="sm"
						onClick={clearMessages}
						disabled={messages.length === 0}
						className="gap-1.5"
					>
						<RotateCcw className="h-4 w-4" />
						Clear
					</Button>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 grid gap-6 md:grid-cols-4 min-h-0">
				{/* Chat Area */}
				<Card className="md:col-span-3 flex flex-col overflow-hidden">
					<CardContent className="flex-1 flex flex-col p-0 min-h-0">
						{/* Messages */}
						<div className="flex-1 overflow-y-auto p-6 space-y-6">
							{messages.length === 0 ? (
								<div className="h-full flex flex-col items-center justify-center text-center">
									<div className="rounded-full bg-primary/10 p-4 mb-4">
										<Sparkles className="h-8 w-8 text-primary" />
									</div>
									<h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
									<p className="text-muted-foreground mb-6 max-w-sm">
										Test how your agent responds to different prompts and questions.
									</p>
									<div className="flex flex-wrap gap-2 justify-center">
										{suggestedPrompts.map((prompt) => (
											<Button
												key={prompt}
												variant="outline"
												size="sm"
												className="text-xs"
												onClick={() => {
													if (inputRef.current) {
														inputRef.current.value = prompt
														inputRef.current.focus()
													}
												}}
											>
												{prompt}
											</Button>
										))}
									</div>
								</div>
							) : (
								<>
									{messages.map((message) => (
										<div
											key={message.id}
											className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
										>
											<div
												className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
													message.role === 'user' ? 'bg-primary' : 'bg-primary/10'
												}`}
											>
												{message.role === 'user' ? (
													<User className="h-4 w-4 text-primary-foreground" />
												) : (
													<Bot className="h-4 w-4 text-primary" />
												)}
											</div>
											<div className="max-w-[75%] flex flex-col gap-2">
												{message.role === 'assistant' && message.toolCalls && (
													<ToolCallList toolCalls={message.toolCalls} />
												)}
												{message.content && (
													<div
														className={`rounded-2xl px-4 py-3 ${
															message.role === 'user'
																? 'bg-primary text-primary-foreground rounded-tr-sm'
																: 'bg-muted rounded-tl-sm'
														}`}
													>
														<p className="whitespace-pre-wrap text-sm leading-relaxed">
															{message.content}
														</p>
													</div>
												)}
											</div>
										</div>
									))}
									{isStreaming &&
										messages[messages.length - 1]?.role === 'assistant' &&
										messages[messages.length - 1]?.content === '' && (
											<div className="flex gap-3">
												<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
													<Bot className="h-4 w-4 text-primary" />
												</div>
												<div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
													<div className="flex gap-1.5">
														<span
															className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
															style={{ animationDelay: '0ms' }}
														/>
														<span
															className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
															style={{ animationDelay: '150ms' }}
														/>
														<span
															className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
															style={{ animationDelay: '300ms' }}
														/>
													</div>
												</div>
											</div>
										)}
								</>
							)}
							<div ref={messagesEndRef} />
						</div>

						{/* Error */}
						{chatError && (
							<div className="mx-6 mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2">
								<Info className="h-4 w-4 flex-shrink-0" />
								{chatError}
							</div>
						)}

						{/* Input */}
						<div className="border-t p-4">
							<div className="flex gap-3">
								<Input
									ref={inputRef}
									placeholder="Type your message..."
									disabled={isStreaming}
									className="rounded-full px-4"
									onKeyDown={(e) => {
										if (e.key === 'Enter' && !e.shiftKey) {
											e.preventDefault()
											handleSend()
										}
									}}
								/>
								<Button
									onClick={handleSend}
									size="icon"
									disabled={isStreaming}
									className="rounded-full flex-shrink-0"
								>
									<Send className="h-4 w-4" />
								</Button>
							</div>
							<p className="text-xs text-muted-foreground text-center mt-2">
								Press Enter to send, Shift+Enter for new line
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Sidebar */}
				<div className="space-y-4">
					{/* Agent Config */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-medium flex items-center gap-2">
								<Settings className="h-4 w-4" />
								Configuration
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Model</span>
								<Badge variant="secondary" className="font-mono text-xs">
									{getModelName(agent.model).split(' ')[0]}
								</Badge>
							</div>
							{agent.config?.temperature !== undefined && (
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Temperature</span>
									<span className="text-sm font-medium">{agent.config.temperature}</span>
								</div>
							)}
							{agent.config?.maxTokens !== undefined && (
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Max Tokens</span>
									<span className="text-sm font-medium">
										{agent.config.maxTokens.toLocaleString()}
									</span>
								</div>
							)}
							<Separator />
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
									<Wrench className="h-3.5 w-3.5" />
									Tools
								</div>
								<span className="text-sm font-medium">{agent.toolIds.length} enabled</span>
							</div>
						</CardContent>
					</Card>

					{/* Tips */}
					<Card className="bg-muted/50">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-medium flex items-center gap-2">
								<Lightbulb className="h-4 w-4" />
								Tips
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm text-muted-foreground">
							<div className="flex gap-2">
								<Zap className="h-4 w-4 flex-shrink-0 mt-0.5" />
								<p>Test edge cases to find unexpected behaviors.</p>
							</div>
							<div className="flex gap-2">
								<Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
								<p>Note response times for optimization.</p>
							</div>
							<div className="flex gap-2">
								<Settings className="h-4 w-4 flex-shrink-0 mt-0.5" />
								<p>Adjust system prompt if responses aren't right.</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
