'use client'

import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardFooter } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { ArrowRight, Loader2, Rabbit } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { APP_CONFIG, AUTH_CONTENT } from 'web-app/config'
import { signUp } from 'web-app/lib/auth-client'

const { signUp: content, fields, validation } = AUTH_CONTENT

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
			toast.error(validation.passwordsNoMatch)
			return
		}

		if (password.length < 8) {
			toast.error(validation.passwordMinLength)
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

			toast.success(AUTH_CONTENT.success.signUp)
			router.push('/dashboard')
			router.refresh()
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
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
						<Rabbit className="h-6 w-6 text-white" />
					</div>
					<span className="font-bold text-2xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{APP_CONFIG.name}</span>
				</Link>
			</div>

			<div className="flex flex-col space-y-2 text-center lg:text-left">
				<h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
				<p className="text-muted-foreground">{content.subtitle}</p>
			</div>

			<Card className="border-border/50 shadow-lg">
				<form onSubmit={handleSubmit}>
					<CardContent className="pt-6 space-y-5">
						<div className="space-y-2">
							<Label htmlFor="name" className="text-sm font-medium">
								{fields.name.label}
							</Label>
							<Input
								id="name"
								placeholder={fields.name.placeholder}
								value={name}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
								required
								disabled={isLoading}
								className="h-11"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email" className="text-sm font-medium">
								{fields.email.label}
							</Label>
							<Input
								id="email"
								type="email"
								placeholder={fields.email.placeholder}
								value={email}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
								required
								disabled={isLoading}
								className="h-11"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password" className="text-sm font-medium">
								{fields.password.label}
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
								{fields.confirmPassword.label}
							</Label>
							<Input
								id="confirm-password"
								type="password"
								placeholder={fields.confirmPassword.placeholder}
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
							className="w-full gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25"
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									{content.loadingButton}
								</>
							) : (
								<>
									{content.submitButton}
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</Button>
						<div className="text-sm text-center text-muted-foreground">
							{content.hasAccount}{' '}
							<Link href="/sign-in" className="text-primary hover:underline font-medium">
								{content.signInLink}
							</Link>
						</div>
					</CardFooter>
				</form>
			</Card>

			<p className="text-xs text-center text-muted-foreground px-4">
				{content.terms}{' '}
				<Link href="/terms" className="text-primary hover:underline">
					{content.termsLink}
				</Link>{' '}
				and{' '}
				<Link href="/privacy" className="text-primary hover:underline">
					{content.privacyLink}
				</Link>
			</p>
		</div>
	)
}
