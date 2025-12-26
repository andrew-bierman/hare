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
import { signIn } from 'web-app/lib/auth-client'

const { signIn: content, fields } = AUTH_CONTENT

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

			toast.success(AUTH_CONTENT.success.signIn)
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
					<span className="font-bold text-2xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
						{APP_CONFIG.name}
					</span>
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
							<div className="flex items-center justify-between">
								<Label htmlFor="password" className="text-sm font-medium">
									{fields.password.label}
								</Label>
								<Link
									href="/forgot-password"
									className="text-xs text-primary hover:underline font-medium"
								>
									{content.forgotPassword}
								</Link>
							</div>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
								required
								disabled={isLoading}
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
							{content.noAccount}{' '}
							<Link href="/sign-up" className="text-primary hover:underline font-medium">
								{content.signUpLink}
							</Link>
						</div>
					</CardFooter>
				</form>
			</Card>
		</div>
	)
}
