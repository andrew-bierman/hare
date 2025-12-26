import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import '@workspace/ui/globals.css'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: 'Chat Widget',
	description: 'Embedded chat widget',
}

/**
 * Minimal layout for embedded widget - no providers, navigation, or extra UI
 * This keeps the widget lightweight and isolated
 */
export default function EmbedLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<head>
				<meta name="robots" content="noindex, nofollow" />
			</head>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
		</html>
	)
}
