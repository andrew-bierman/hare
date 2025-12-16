import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col space-y-2 text-center">
				<h1 className="text-3xl font-bold tracking-tight">Hare</h1>
				<p className="text-sm text-muted-foreground">Create an account to get started</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Sign Up</CardTitle>
					<CardDescription>Enter your information to create an account</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Full Name</Label>
						<Input id="name" placeholder="John Doe" />
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" placeholder="you@example.com" />
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input id="password" type="password" />
					</div>
					<div className="space-y-2">
						<Label htmlFor="confirm-password">Confirm Password</Label>
						<Input id="confirm-password" type="password" />
					</div>
				</CardContent>
				<CardFooter className="flex flex-col space-y-4">
					<Button className="w-full">Create Account</Button>
					<div className="text-sm text-center text-muted-foreground">
						Already have an account?{" "}
						<Link href="/sign-in" className="text-primary hover:underline">
							Sign in
						</Link>
					</div>
				</CardFooter>
			</Card>
		</div>
	);
}
