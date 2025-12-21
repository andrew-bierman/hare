'use client'

import { Bot, RotateCcw, Send, User } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/components/card'
import { Input } from '@repo/ui/components/input'
import { Skeleton } from '@repo/ui/components/skeleton'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { useAgent, useChat, AVAILABLE_MODELS } from 'web-app/lib/api/hooks'

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
	const { data: agent, isLoading: agentLoading, error: agentError } = useAgent(agentId, activeWorkspace?.id)
	const { messages, isStreaming, error: chatError, sendMessage, clearMessages } = useChat(agentId)

	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

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
				<Card className="p-6 text-center">
					<p className="text-destructive">
						{agentError?.message || 'Agent not found'}
					</p>
					<Button className="mt-4" onClick={() => router.push('/dashboard/agents')}>
						Back to Agents
					</Button>
				</Card>
			</div>
		)
	}

	if (agent.status !== 'deployed') {
		return (
			<div className="flex-1 p-8 pt-6">
				<Card className="p-6 text-center">
					<Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<h3 className="text-lg font-semibold">Agent Not Deployed</h3>
					<p className="text-muted-foreground mt-2 mb-4">
						You need to deploy this agent before you can test it in the playground.
					</p>
					<Button onClick={() => router.push(`/dashboard/agents/${agentId}`)}>
						Go to Agent Settings
					</Button>
				</Card>
			</div>
		)
	}

	return (
		<div className="flex-1 space-y-4 p-8 pt-6 h-full">
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-3xl font-bold tracking-tight">{agent.name}</h2>
						<Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
							Live
						</Badge>
					</div>
					<p className="text-muted-foreground mt-2">
						Test and interact with your agent in real-time
					</p>
				</div>
				<Button variant="outline" onClick={clearMessages} disabled={messages.length === 0}>
					<RotateCcw className="mr-2 h-4 w-4" />
					New Conversation
				</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-4 h-[calc(100vh-220px)]">
				<Card className="md:col-span-3 flex flex-col">
					<CardHeader className="pb-3">
						<CardTitle>Chat</CardTitle>
						<CardDescription>Test your agent's responses</CardDescription>
					</CardHeader>
					<CardContent className="flex-1 flex flex-col min-h-0">
						<div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
							{messages.length === 0 && (
								<div className="flex-1 flex items-center justify-center h-full">
									<div className="text-center text-muted-foreground">
										<Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
										<p>Start a conversation with your agent</p>
									</div>
								</div>
							)}
							{messages.map((message) => (
								<div
									key={message.id}
									className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
								>
									{message.role === 'assistant' && (
										<div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
											<Bot className="h-4 w-4 text-violet-600 dark:text-violet-300" />
										</div>
									)}
									<div
										className={`max-w-[80%] rounded-lg px-4 py-2 ${
											message.role === 'user'
												? 'bg-primary text-primary-foreground'
												: 'bg-muted'
										}`}
									>
										<p className="whitespace-pre-wrap">{message.content}</p>
									</div>
									{message.role === 'user' && (
										<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
											<User className="h-4 w-4 text-primary-foreground" />
										</div>
									)}
								</div>
							))}
							{isStreaming && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
								<div className="flex gap-3 justify-start">
									<div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
										<Bot className="h-4 w-4 text-violet-600 dark:text-violet-300" />
									</div>
									<div className="bg-muted rounded-lg px-4 py-2">
										<div className="flex gap-1">
											<span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
											<span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
											<span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
										</div>
									</div>
								</div>
							)}
							<div ref={messagesEndRef} />
						</div>

						{chatError && (
							<div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
								{chatError}
							</div>
						)}

						<div className="flex gap-2">
							<Input
								ref={inputRef}
								placeholder="Type a message..."
								disabled={isStreaming}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault()
										handleSend()
									}
								}}
							/>
							<Button onClick={handleSend} size="icon" disabled={isStreaming}>
								<Send className="h-4 w-4" />
							</Button>
						</div>
					</CardContent>
				</Card>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Agent Info</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<div className="text-sm font-medium mb-1">Model</div>
								<div className="text-sm text-muted-foreground">{getModelName(agent.model)}</div>
							</div>
							{agent.config?.temperature !== undefined && (
								<div>
									<div className="text-sm font-medium mb-1">Temperature</div>
									<div className="text-sm text-muted-foreground">{agent.config.temperature}</div>
								</div>
							)}
							{agent.config?.maxTokens !== undefined && (
								<div>
									<div className="text-sm font-medium mb-1">Max Tokens</div>
									<div className="text-sm text-muted-foreground">{agent.config.maxTokens}</div>
								</div>
							)}
							<div>
								<div className="text-sm font-medium mb-1">Tools</div>
								<div className="text-sm text-muted-foreground">
									{agent.toolIds.length} enabled
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Tips</CardTitle>
						</CardHeader>
						<CardContent className="text-sm text-muted-foreground space-y-2">
							<p>Test your agent with various prompts to ensure it behaves as expected.</p>
							<p>If responses aren't what you expect, adjust the system prompt in agent settings.</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
