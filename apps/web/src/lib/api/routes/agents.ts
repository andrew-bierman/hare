import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  model: z.string(),
  instructions: z.string().min(1),
  config: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(100000).default(4096),
    topP: z.number().min(0).max(1).optional(),
    stopSequences: z.array(z.string()).optional(),
    memory: z.object({
      enabled: z.boolean().default(true),
      maxMessages: z.number().min(1).max(100).default(20),
      retentionDays: z.number().min(1).max(365).default(30),
    }).default({
      enabled: true,
      maxMessages: 20,
      retentionDays: 30,
    }),
  }).optional().default({
    temperature: 0.7,
    maxTokens: 4096,
    memory: {
      enabled: true,
      maxMessages: 20,
      retentionDays: 30,
    },
  }),
  toolIds: z.array(z.string()).optional(),
})

const updateAgentSchema = createAgentSchema.partial()

const deployAgentSchema = z.object({
  version: z.string().optional(),
})

const app = new Hono()
  // List agents
  .get('/', async (c) => {
    // TODO: Get from DB filtered by workspace (from header or query)
    return c.json({
      agents: [
        {
          id: 'agent_xxx',
          name: 'Customer Support Agent',
          description: 'Handles customer inquiries',
          model: 'llama-3.1-70b-instruct',
          status: 'deployed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]
    })
  })

  // Create agent
  .post('/', zValidator('json', createAgentSchema), async (c) => {
    const data = c.req.valid('json')
    // TODO: Insert to DB
    const agent = {
      id: 'agent_' + Math.random().toString(36).substr(2, 9),
      ...data,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return c.json(agent, 201)
  })

  // Get agent
  .get('/:id', async (c) => {
    const id = c.req.param('id')
    // TODO: Get from DB with authorization check
    return c.json({
      id,
      name: 'Customer Support Agent',
      description: 'Handles customer inquiries',
      model: 'llama-3.1-70b-instruct',
      instructions: 'You are a helpful customer support agent. Be polite and professional.',
      config: {
        temperature: 0.7,
        maxTokens: 4096,
        memory: {
          enabled: true,
          maxMessages: 20,
          retentionDays: 30,
        },
      },
      status: 'deployed',
      tools: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })

  // Update agent
  .patch('/:id', zValidator('json', updateAgentSchema), async (c) => {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    // TODO: Update in DB with authorization check
    return c.json({
      id,
      ...data,
      updatedAt: new Date().toISOString(),
    })
  })

  // Delete agent
  .delete('/:id', async (c) => {
    const id = c.req.param('id')
    // TODO: Delete from DB with authorization check
    return c.json({ success: true })
  })

  // Deploy agent
  .post('/:id/deploy', zValidator('json', deployAgentSchema), async (c) => {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    // TODO: Update agent status to 'deployed' in DB
    // TODO: Create deployment record
    return c.json({
      id,
      status: 'deployed',
      deployedAt: new Date().toISOString(),
      version: data.version || '1.0.0',
    })
  })

export default app
