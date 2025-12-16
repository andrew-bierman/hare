import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
})

const app = new Hono()
  // List user workspaces
  .get('/', async (c) => {
    // TODO: Get from DB with user filter
    return c.json({
      workspaces: [
        {
          id: 'ws_xxx',
          name: 'My Workspace',
          description: 'Default workspace',
          role: 'owner',
          createdAt: new Date().toISOString(),
        }
      ]
    })
  })

  // Create workspace
  .post('/', zValidator('json', createWorkspaceSchema), async (c) => {
    const data = c.req.valid('json')
    // TODO: Insert to DB
    const workspace = {
      id: 'ws_' + Math.random().toString(36).substr(2, 9),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return c.json(workspace, 201)
  })

  // Get workspace
  .get('/:id', async (c) => {
    const id = c.req.param('id')
    // TODO: Get from DB with authorization check
    return c.json({
      id,
      name: 'My Workspace',
      description: 'Default workspace',
      role: 'owner',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })

  // Update workspace
  .patch('/:id', zValidator('json', updateWorkspaceSchema), async (c) => {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    // TODO: Update in DB with authorization check
    return c.json({
      id,
      ...data,
      updatedAt: new Date().toISOString(),
    })
  })

  // Delete workspace
  .delete('/:id', async (c) => {
    const id = c.req.param('id')
    // TODO: Delete from DB with authorization check
    return c.json({ success: true })
  })

export default app
