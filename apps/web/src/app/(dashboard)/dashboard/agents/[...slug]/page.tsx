import AgentRouter from './agent-router'

// Required for static export with catch-all routes
// Return a placeholder path - actual routing is handled client-side
export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
	// Return at least one path for static export to work
	// The catch-all will handle all paths client-side
	return [{ slug: ['_'] }]
}

export default function AgentCatchAllPage() {
	return <AgentRouter />
}
