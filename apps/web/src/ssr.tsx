import { StartServer } from '@tanstack/react-start/server'
import { getRouter } from './router'

const router = getRouter()

export default function SSRHandler() {
	return <StartServer router={router} />
}
