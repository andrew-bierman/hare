import { WorkspaceProvider } from '@hare/app'
import {
	DashboardErrorComponent,
	DashboardNotFound,
	DashboardPendingComponent,
	DevTools,
	Header,
	Sidebar,
	UserNav,
	WorkspaceSwitcher,
} from '@hare/app/widgets'
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard')({
	component: DashboardLayout,
	errorComponent: DashboardErrorComponent,
	notFoundComponent: DashboardNotFound,
	pendingComponent: DashboardPendingComponent,
})

function DashboardLayout() {
	const { pathname } = useLocation()
	const navigate = useNavigate()

	return (
		<WorkspaceProvider>
			<div className="h-screen flex bg-background overflow-x-hidden">
				{/* Sidebar */}
				<div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-50">
					<Sidebar pathname={pathname} Link={Link} WorkspaceSwitcher={WorkspaceSwitcher} />
				</div>

				{/* Main content */}
				<main className="md:pl-72 flex-1 flex flex-col min-h-screen">
					<Header
						Link={Link}
						UserNav={() => <UserNav Link={Link} />}
						onNavigate={(path) => navigate({ to: path })}
					/>
					<div className="flex-1 overflow-y-auto bg-muted/20">
						<Outlet />
					</div>
				</main>
			</div>
			<DevTools />
		</WorkspaceProvider>
	)
}
