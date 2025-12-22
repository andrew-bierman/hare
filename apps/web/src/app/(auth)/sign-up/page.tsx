'use client'

import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardFooter } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { ArrowRight, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, type FormEvent, useState } from 'react'
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
		<div className="space-y-8">
			{/* Mobile logo */}
			<div className="lg:hidden flex flex-col items-center space-y-4">
				<Link href="/" className="flex items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
						<Sparkles className="h-6 w-6 text-primary-foreground" />
					</div>
					<span className="font-bold text-2xl">Hare</span>
				</Link>
			</div>

			<div className="flex flex-col space-y-2 text-center lg:text-left">
				<h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
				<p className="text-muted-foreground">Get started with Hare for free</p>
			</div>

			<Card className="border-border/50 shadow-lg">
				<form onSubmit={handleSubmit}>
					<CardContent className="pt-6 space-y-5">
						<div className="space-y-2">
							<Label htmlFor="name" className="text-sm font-medium">
								Full Name
							</Label>
							<Input
								id="name"
								placeholder="John Doe"
								value={name}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
								required
								disabled={isLoading}
								className="h-11"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email" className="text-sm font-medium">
								Email
							</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
								required
								disabled={isLoading}
								className="h-11"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password" className="text-sm font-medium">
								Password
							</Label>
							<Input
								id="password"
								type="password"
								placeholder="At least 8 characters"
								value={password}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
								required
								disabled={isLoading}
								minLength={8}
								className="h-11"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-password" className="text-sm font-medium">
								Confirm Password
							</Label>
							<Input
								id="confirm-password"
								type="password"
								placeholder="Confirm your password"
								value={confirmPassword}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
								required
								disabled={isLoading}
								minLength={8}
								className="h-11"
							/>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col space-y-4 pt-2">
						<Button
							type="submit"
							size="lg"
							className="w-full gap-2 shadow-lg shadow-primary/25"
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Creating account...
								</>
							) : (
								<>
									Create Account
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</Button>
						<div className="text-sm text-center text-muted-foreground">
							Already have an account?{' '}
							<Link href="/sign-in" className="text-primary hover:underline font-medium">
								Sign in
							</Link>
						</div>
					</CardFooter>
				</form>
			</Card>

			<p className="text-xs text-center text-muted-foreground px-4">
				By creating an account, you agree to our{' '}
				<Link href="/terms" className="text-primary hover:underline">
					Terms of Service
				</Link>{' '}
				and{' '}
				<Link href="/privacy" className="text-primary hover:underline">
					Privacy Policy
				</Link>
			</p>
		</div>
	)
}
