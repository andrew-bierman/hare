import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { streamSSE } from 'hono/streaming'

const chatSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

const app = new Hono()
  // Chat with agent (SSE stream)
  .post('/agents/:id/chat', zValidator('json', chatSchema), async (c) => {
    const agentId = c.req.param('id')
    const { message, sessionId, metadata } = c.req.valid('json')

    // TODO: Validate agent exists and is deployed
    // TODO: Forward to agent runtime worker

    return streamSSE(c, async (stream) => {
      // Simulate streaming response
      const tokens = message.split(' ')

      for (const token of tokens) {
        await stream.writeSSE({
          event: 'message',
          data: JSON.stringify({
            type: 'text',
            content: token + ' ',
          }),
        })
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({
          type: 'done',
          sessionId: sessionId || 'session_xxx',
          usage: {
            tokensIn: 10,
            tokensOut: tokens.length,
            latencyMs: 500,
          },
        }),
      })
    })
  })

  // List agent conversations
  .get('/agents/:id/conversations', async (c) => {
    const agentId = c.req.param('id')
    // TODO: Get from DB
    return c.json({
      conversations: [
        {
          id: 'conv_xxx',
          agentId,
          userId: 'user_xxx',
          title: 'Chat about features',
          messageCount: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]
    })
  })

  // Get conversation messages
  .get('/conversations/:id/messages', async (c) => {
    const conversationId = c.req.param('id')
    // TODO: Get from DB
    return c.json({
      messages: [
        {
          id: 'msg_1',
          conversationId,
          role: 'user',
          content: 'Hello!',
          createdAt: new Date(Date.now() - 60000).toISOString(),
        },
        {
          id: 'msg_2',
          conversationId,
          role: 'assistant',
          content: 'Hi! How can I help you today?',
          createdAt: new Date().toISOString(),
        },
      ],
    })
  })

export default app
