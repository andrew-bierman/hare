import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const createToolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1),
  type: z.enum(['http', 'sql', 'kv', 'r2', 'vectorize', 'custom']),
  inputSchema: z.record(z.string(), z.any()),
  config: z.record(z.string(), z.any()).optional(),
  code: z.string().optional(), // For custom tools
})

const updateToolSchema = createToolSchema.partial()

const app = new Hono()
  // List available tools
  .get('/', async (c) => {
    // TODO: Get from DB (both system tools and workspace custom tools)
    return c.json({
      tools: [
        {
          id: 'tool_http',
          name: 'HTTP Request',
          description: 'Make HTTP requests to external APIs',
          type: 'http',
          isSystem: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tool_sql',
          name: 'SQL Query',
          description: 'Execute SQL queries on D1 databases',
          type: 'sql',
          isSystem: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tool_kv',
          name: 'KV Storage',
          description: 'Read/write to Cloudflare KV',
          type: 'kv',
          isSystem: true,
          createdAt: new Date().toISOString(),
        },
      ]
    })
  })

  // Create custom tool
  .post('/', zValidator('json', createToolSchema), async (c) => {
    const data = c.req.valid('json')
    // TODO: Insert to DB
    const tool = {
      id: 'tool_' + Math.random().toString(36).substr(2, 9),
      ...data,
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return c.json(tool, 201)
  })

  // Get tool
  .get('/:id', async (c) => {
    const id = c.req.param('id')
    // TODO: Get from DB
    return c.json({
      id,
      name: 'HTTP Request',
      description: 'Make HTTP requests to external APIs',
      type: 'http',
      inputSchema: {
        url: { type: 'string', description: 'The URL to request' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
        headers: { type: 'object', optional: true },
        body: { type: 'any', optional: true },
      },
      config: {},
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })

  // Update tool
  .patch('/:id', zValidator('json', updateToolSchema), async (c) => {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    // TODO: Update in DB (only allow for non-system tools)
    return c.json({
      id,
      ...data,
      updatedAt: new Date().toISOString(),
    })
  })

  // Delete tool
  .delete('/:id', async (c) => {
    const id = c.req.param('id')
    // TODO: Delete from DB (only allow for non-system tools)
    return c.json({ success: true })
  })

export default app
