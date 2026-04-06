/**
 * Agent routes - combines CRUD, deployment, and validation routes
 */

import type { WorkspaceEnv } from '@hare/types'
import { OpenAPIHono } from '@hono/zod-openapi'
import { crudApp } from './crud'
import { deploymentApp } from './deployment'
import { validationApp } from './validation'

// Create the combined app
const app = new OpenAPIHono<WorkspaceEnv>()

// Mount sub-apps
// Note: Routes are merged at the root level since each sub-app defines its own paths
app.route('/', crudApp)
app.route('/', deploymentApp)
app.route('/', validationApp)

export default app
