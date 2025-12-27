import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { ArrowLeft, Bot, Plus } from 'lucide-react'

export const Route = createFileRoute('/agents')({
	component: AgentsPage,
})

function AgentsPage() {
	return (
		<div className="min-h-screen p-8">
			<div className="max-w-6xl mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Link to="/">
							<Button variant="ghost" size="icon">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<div>
							<h1 className="text-3xl font-bold">Agents</h1>
							<p className="text-muted-foreground">Manage your AI agents</p>
						</div>
					</div>
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						New Agent
					</Button>
				</div>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{/* Placeholder agent cards */}
					<Card className="hover:border-primary transition-colors cursor-pointer">
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
									<Bot className="h-5 w-5 text-primary-foreground" />
								</div>
								<div>
									<CardTitle className="text-lg">Example Agent</CardTitle>
									<p className="text-sm text-muted-foreground">llama-3.3-70b</p>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">A helpful assistant for general tasks</p>
						</CardContent>
					</Card>

					<Card className="border-dashed hover:border-primary transition-colors cursor-pointer flex items-center justify-center min-h-[140px]">
						<div className="text-center text-muted-foreground">
							<Plus className="h-8 w-8 mx-auto mb-2" />
							<p>Create new agent</p>
						</div>
					</Card>
				</div>
			</div>
		</div>
	)
}
