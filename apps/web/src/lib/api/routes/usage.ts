import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const usageQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  agentId: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
})

const app = new Hono()
  // Get workspace usage stats
  .get('/', zValidator('query', usageQuerySchema), async (c) => {
    const { startDate, endDate, agentId, groupBy } = c.req.valid('query')

    // TODO: Query usage data from DB
    // TODO: Aggregate by groupBy parameter

    return c.json({
      usage: {
        totalMessages: 1234,
        totalTokensIn: 50000,
        totalTokensOut: 75000,
        totalCost: 1.25,
        byAgent: [
          {
            agentId: 'agent_xxx',
            agentName: 'Customer Support Agent',
            messages: 800,
            tokensIn: 30000,
            tokensOut: 45000,
            cost: 0.75,
          },
          {
            agentId: 'agent_yyy',
            agentName: 'Sales Agent',
            messages: 434,
            tokensIn: 20000,
            tokensOut: 30000,
            cost: 0.50,
          },
        ],
        byDay: [
          {
            date: '2024-12-01',
            messages: 100,
            tokensIn: 4000,
            tokensOut: 6000,
            cost: 0.10,
          },
          {
            date: '2024-12-02',
            messages: 150,
            tokensIn: 6000,
            tokensOut: 9000,
            cost: 0.15,
          },
        ],
      },
      period: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: endDate || new Date().toISOString(),
      },
    })
  })

  // Get agent-specific usage
  .get('/agents/:id', async (c) => {
    const agentId = c.req.param('id')

    // TODO: Query usage data from DB for specific agent

    return c.json({
      agentId,
      usage: {
        totalMessages: 800,
        totalTokensIn: 30000,
        totalTokensOut: 45000,
        totalCost: 0.75,
        averageLatencyMs: 250,
        byModel: [
          {
            model: 'llama-3.1-70b-instruct',
            messages: 800,
            tokensIn: 30000,
            tokensOut: 45000,
            cost: 0.75,
          },
        ],
        byDay: [
          {
            date: '2024-12-01',
            messages: 50,
            tokensIn: 2000,
            tokensOut: 3000,
            cost: 0.05,
          },
        ],
      },
    })
  })

export default app
