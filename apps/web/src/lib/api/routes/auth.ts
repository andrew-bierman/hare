import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const app = new Hono()
  // Sign up
  .post('/sign-up', zValidator('json', signUpSchema), async (c) => {
    const data = c.req.valid('json')
    // TODO: Create user with Better Auth
    return c.json({
      id: 'user_xxx',
      email: data.email,
      name: data.name,
    }, 201)
  })

  // Sign in with email
  .post('/sign-in/email', zValidator('json', signInSchema), async (c) => {
    const data = c.req.valid('json')
    // TODO: Authenticate with Better Auth
    return c.json({
      user: {
        id: 'user_xxx',
        email: data.email,
      },
      session: {
        token: 'session_xxx',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    })
  })

  // Sign out
  .post('/sign-out', async (c) => {
    // TODO: Invalidate session with Better Auth
    return c.json({ success: true })
  })

  // Get current session
  .get('/session', async (c) => {
    // TODO: Get session from Better Auth
    return c.json({
      user: {
        id: 'user_xxx',
        email: 'demo@example.com',
        name: 'Demo User',
      },
    })
  })

  // OAuth callback
  .get('/callback/:provider', async (c) => {
    const provider = c.req.param('provider')
    // TODO: Handle OAuth callback with Better Auth
    return c.json({ provider })
  })

export default app
