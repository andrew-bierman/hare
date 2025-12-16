import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// Import routes
import auth from './routes/auth'
import workspaces from './routes/workspaces'
import agents from './routes/agents'
import tools from './routes/tools'
import chat from './routes/chat'
import usage from './routes/usage'

const app = new Hono().basePath('/api')

// Middleware
app.use('*', logger())
app.use('*', cors())

// Mount routes
app.route('/auth', auth)
app.route('/workspaces', workspaces)
app.route('/agents', agents)
app.route('/tools', tools)
app.route('/chat', chat)
app.route('/usage', usage)

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

export type AppType = typeof app
export { app }
