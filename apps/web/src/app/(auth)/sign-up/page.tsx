'use client'

import { Button } from '@workspace/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { signUp } from 'web-app/lib/auth-client'

export default function SignUpPage() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()

		if (password !== confirmPassword) {
			toast.error('Passwords do not match')
			return
		}

		if (password.length < 8) {
			toast.error('Password must be at least 8 characters')
			return
		}

		setIsLoading(true)

		try {
			const result = await signUp.email({
				email,
				password,
				name,
			})

			if (result.error) {
				toast.error(result.error.message || 'Failed to create account')
				return
			}

			toast.success('Account created successfully')
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
				<p className="text-sm text-muted-foreground">Create an account to get started</p>
			</div>

			<Card>
				<form onSubmit={handleSubmit}>
					<CardHeader>
						<CardTitle>Sign Up</CardTitle>
						<CardDescription>Enter your information to create an account</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Full Name</Label>
							<Input
								id="name"
								placeholder="John Doe"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>
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
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={isLoading}
								minLength={8}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-password">Confirm Password</Label>
							<Input
								id="confirm-password"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								disabled={isLoading}
								minLength={8}
							/>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col space-y-4">
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? 'Creating account...' : 'Create Account'}
						</Button>
						<div className="text-sm text-center text-muted-foreground">
							Already have an account?{' '}
							<Link href="/sign-in" className="text-primary hover:underline">
								Sign in
							</Link>
						</div>
					</CardFooter>
				</form>
			</Card>
		</div>
	)
}
