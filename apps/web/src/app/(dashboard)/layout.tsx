import { Header } from 'web-app/components/layout/header'
import { Sidebar } from 'web-app/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="h-screen flex bg-background">
			{/* Sidebar */}
			<div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-50">
				<Sidebar />
			</div>

			{/* Main content */}
			<main className="md:pl-72 flex-1 flex flex-col min-h-screen">
				<Header />
				<div className="flex-1 overflow-y-auto bg-muted/20">
					{children}
				</div>
			</main>
		</div>
	)
}
