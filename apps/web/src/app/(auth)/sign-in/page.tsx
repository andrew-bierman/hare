'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from 'web-app/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from 'web-app/components/ui/card'
import { Input } from 'web-app/components/ui/input'
import { Label } from 'web-app/components/ui/label'
import { signIn } from 'web-app/lib/auth-client'

export default function SignInPage() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		setIsLoading(true)

		try {
			const result = await signIn.email({
				email,
				password,
			})

			if (result.error) {
				toast.error(result.error.message || 'Failed to sign in')
				return
			}

			toast.success('Signed in successfully')
			router.push('/')
		} catch (error) {
			toast.error('An unexpected error occurred')
			console.error(error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col space-y-2 text-center">
				<h1 className="text-3xl font-bold tracking-tight">Hare</h1>
				<p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
			</div>

			<Card>
				<form onSubmit={handleSubmit}>
					<CardHeader>
						<CardTitle>Sign In</CardTitle>
						<CardDescription>Enter your email and password to access your account</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="password">Password</Label>
								<Link
									href="/forgot-password"
									className="text-xs text-muted-foreground hover:underline"
								>
									Forgot password?
								</Link>
							</div>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col space-y-4">
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? 'Signing in...' : 'Sign In'}
						</Button>
						<div className="text-sm text-center text-muted-foreground">
							Don't have an account?{' '}
							<Link href="/sign-up" className="text-primary hover:underline">
								Sign up
							</Link>
						</div>
					</CardFooter>
				</form>
			</Card>
		</div>
	)
}
