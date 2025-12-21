import { Bell, Key, Shield, User } from 'lucide-react'
import { Button } from 'web-app/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from 'web-app/components/ui/card'
import { Input } from 'web-app/components/ui/input'
import { Label } from 'web-app/components/ui/label'
import { Separator } from 'web-app/components/ui/separator'

export default function SettingsPage() {
	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">Settings</h2>
			</div>

			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<User className="h-5 w-5 text-zinc-500" />
							<CardTitle>Profile</CardTitle>
						</div>
						<CardDescription>Manage your account information</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Name</Label>
							<Input id="name" placeholder="Your name" />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<Input id="email" type="email" placeholder="your@email.com" />
						</div>
						<Button>Save Changes</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Key className="h-5 w-5 text-zinc-500" />
							<CardTitle>API Keys</CardTitle>
						</div>
						<CardDescription>Manage your API keys for programmatic access</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between p-4 border rounded-lg">
							<div>
								<p className="font-medium">Production Key</p>
								<p className="text-sm text-muted-foreground">Created Dec 1, 2024</p>
							</div>
							<div className="flex gap-2">
								<Button variant="outline" size="sm">Reveal</Button>
								<Button variant="outline" size="sm">Regenerate</Button>
							</div>
						</div>
						<Button variant="outline">Create New Key</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Bell className="h-5 w-5 text-zinc-500" />
							<CardTitle>Notifications</CardTitle>
						</div>
						<CardDescription>Configure how you receive notifications</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Email Notifications</p>
									<p className="text-sm text-muted-foreground">Receive updates via email</p>
								</div>
								<Button variant="outline" size="sm">Enabled</Button>
							</div>
							<Separator />
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Usage Alerts</p>
									<p className="text-sm text-muted-foreground">Get notified when approaching limits</p>
								</div>
								<Button variant="outline" size="sm">Enabled</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Shield className="h-5 w-5 text-zinc-500" />
							<CardTitle>Security</CardTitle>
						</div>
						<CardDescription>Manage your security preferences</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Two-Factor Authentication</p>
								<p className="text-sm text-muted-foreground">Add an extra layer of security</p>
							</div>
							<Button variant="outline" size="sm">Enable</Button>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Active Sessions</p>
								<p className="text-sm text-muted-foreground">Manage your active sessions</p>
							</div>
							<Button variant="outline" size="sm">View All</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
