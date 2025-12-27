import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@workspace/ui/components/card'
import { Bot, Settings, Wrench } from 'lucide-react'

export const Route = createFileRoute('/')({
	component: HomePage,
})

function HomePage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-8">
			<div className="max-w-4xl w-full space-y-8">
				<div className="text-center space-y-4">
					<h1 className="text-4xl font-bold tracking-tight">Hare Desktop</h1>
					<p className="text-xl text-muted-foreground">AI Agent Platform - Desktop Edition</p>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<Link to="/agents">
						<Card className="hover:border-primary transition-colors cursor-pointer h-full">
							<CardHeader>
								<Bot className="h-8 w-8 mb-2 text-primary" />
								<CardTitle>Agents</CardTitle>
								<CardDescription>Create and manage your AI agents</CardDescription>
							</CardHeader>
							<CardContent>
								<Button variant="outline" className="w-full">
									View Agents
								</Button>
							</CardContent>
						</Card>
					</Link>

					<Link to="/tools">
						<Card className="hover:border-primary transition-colors cursor-pointer h-full">
							<CardHeader>
								<Wrench className="h-8 w-8 mb-2 text-primary" />
								<CardTitle>Tools</CardTitle>
								<CardDescription>Browse and configure available tools</CardDescription>
							</CardHeader>
							<CardContent>
								<Button variant="outline" className="w-full">
									View Tools
								</Button>
							</CardContent>
						</Card>
					</Link>

					<Link to="/settings">
						<Card className="hover:border-primary transition-colors cursor-pointer h-full">
							<CardHeader>
								<Settings className="h-8 w-8 mb-2 text-primary" />
								<CardTitle>Settings</CardTitle>
								<CardDescription>Configure your workspace settings</CardDescription>
							</CardHeader>
							<CardContent>
								<Button variant="outline" className="w-full">
									Open Settings
								</Button>
							</CardContent>
						</Card>
					</Link>
				</div>
			</div>
		</div>
	)
}
