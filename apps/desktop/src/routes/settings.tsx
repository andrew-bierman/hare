import { createFileRoute, Link } from '@tanstack/react-router'
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
import { ArrowLeft, ExternalLink } from 'lucide-react'

export const Route = createFileRoute('/settings')({
	component: SettingsPage,
})

function SettingsPage() {
	const apiUrl = import.meta.env.VITE_API_URL || 'https://hare.pages.dev'

	return (
		<div className="min-h-screen p-8">
			<div className="max-w-2xl mx-auto space-y-6">
				<div className="flex items-center gap-4">
					<Link to="/">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<h1 className="text-3xl font-bold">Settings</h1>
						<p className="text-muted-foreground">Configure your desktop app</p>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>API Connection</CardTitle>
						<CardDescription>Configure the connection to the Hare backend</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="api-url">API URL</Label>
							<Input id="api-url" value={apiUrl} readOnly />
							<p className="text-xs text-muted-foreground">
								The desktop app connects to the hosted Hare API
							</p>
						</div>
						<Button variant="outline" asChild>
							<a href={apiUrl} target="_blank" rel="noopener noreferrer">
								Open in Browser
								<ExternalLink className="h-4 w-4 ml-2" />
							</a>
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>About</CardTitle>
						<CardDescription>Hare Desktop Application</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2 text-sm text-muted-foreground">
						<p>Version: 0.1.0</p>
						<p>Built with Tauri + React</p>
						<p>
							<a
								href="https://github.com/andrew-bierman/hare"
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:underline"
							>
								GitHub Repository
							</a>
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
