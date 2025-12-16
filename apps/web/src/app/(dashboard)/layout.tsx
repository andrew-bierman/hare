import { Header } from '../../components/layout/header'
import { Sidebar } from '../../components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="h-screen flex">
			<div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0">
				<Sidebar />
			</div>
			<main className="md:pl-72 flex-1 flex flex-col">
				<Header />
				<div className="flex-1 overflow-y-auto">{children}</div>
			</main>
		</div>
	)
}
