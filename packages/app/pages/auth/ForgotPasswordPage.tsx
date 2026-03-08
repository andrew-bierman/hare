'use client'

import { Link } from '@tanstack/react-router'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent } from '@hare/ui/components/card'
import { Input } from '@hare/ui/components/input'
import { Label } from '@hare/ui/components/label'
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Mail, Rabbit } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { config } from '@hare/config'
import { requestPasswordReset } from '@hare/auth/client'

const { forgotPassword: content, fields } = config.content.auth

export function ForgotPasswordPage() {
	const [isLoading, setIsLoading] = useState(false)
	const [email, setEmail] = useState('')
	const [emailSent, setEmailSent] = useState(false)

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		setIsLoading(true)

		try {
			const result = await requestPasswordReset({
				email,
				redirectTo: `${window.location.origin}/reset-password`,
			})

			if (result.error) {
				toast.error(result.error.message || 'Failed to send reset email')
				return
			}

			setEmailSent(true)
			toast.success(config.content.auth.success.passwordResetSent)
		} catch (_error) {
			toast.error('An unexpected error occurred')
		} finally {
			setIsLoading(false)
		}
	}

	async function handleResend() {
		setIsLoading(true)
		try {
			await requestPasswordReset({
				email,
				redirectTo: `${window.location.origin}/reset-password`,
			})
			toast.success(config.content.auth.success.passwordResetSent)
		} catch (_error) {
			toast.error('Failed to resend email')
		} finally {
			setIsLoading(false)
		}
	}

	if (emailSent) {
		return (
			<div className="space-y-8">
				{/* Mobile logo */}
				<div className="lg:hidden flex flex-col items-center space-y-4">
					<Link to="/" className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
							<Rabbit className="h-6 w-6 text-white" />
						</div>
						<span className="font-bold text-2xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
							{config.app.name}
						</span>
					</Link>
				</div>

				<Card className="border-border/50 shadow-lg">
					<CardContent className="pt-6 space-y-6 text-center">
						<div className="flex justify-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
								<CheckCircle className="h-8 w-8 text-white" />
							</div>
						</div>
						<div className="space-y-2">
							<h1 className="text-2xl font-bold tracking-tight">
								{content.emailSent.title}
							</h1>
							<p className="text-muted-foreground">
								{content.emailSent.subtitle}
							</p>
							<p className="font-medium text-foreground">{email}</p>
						</div>
						<div className="flex items-center justify-center gap-2">
							<Mail className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm text-muted-foreground">
								{content.emailSent.resendPrompt}
							</span>
							<button
								type="button"
								onClick={handleResend}
								disabled={isLoading}
								className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
							>
								{isLoading ? 'Sending...' : content.emailSent.resendLink}
							</button>
						</div>
						<Link
							to={'/sign-in' as string}
							className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<ArrowLeft className="h-4 w-4" />
							{content.backToSignIn}
						</Link>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="space-y-8">
			{/* Mobile logo */}
			<div className="lg:hidden flex flex-col items-center space-y-4">
				<Link to="/" className="flex items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
						<Rabbit className="h-6 w-6 text-white" />
					</div>
					<span className="font-bold text-2xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
						{config.app.name}
					</span>
				</Link>
			</div>

			<div className="flex flex-col space-y-2 text-center lg:text-left">
				<h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
				<p className="text-muted-foreground">{content.subtitle}</p>
			</div>

			<Card className="border-border/50 shadow-lg">
				<CardContent className="pt-6 space-y-5">
					<form onSubmit={handleSubmit} className="space-y-5">
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
					</form>
					<div className="text-center">
						<Link
							to={'/sign-in' as string}
							className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<ArrowLeft className="h-4 w-4" />
							{content.backToSignIn}
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
