import { Memory } from '@mastra/memory'

export interface ConversationMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface MemoryStore {
  saveMessage(message: ConversationMessage): Promise<void>
  getMessages(conversationId: string, limit?: number): Promise<ConversationMessage[]>
  searchMessages(conversationId: string, query: string, limit?: number): Promise<ConversationMessage[]>
  deleteConversation(conversationId: string): Promise<void>
}

export class D1MemoryStore implements MemoryStore {
  constructor(private db: D1Database, private vectorize?: VectorizeIndex) {}

  async saveMessage(message: ConversationMessage): Promise<void> {
    // Save to D1 for conversation history
    await this.db
      .prepare(
        `INSERT INTO conversation_messages (id, conversation_id, role, content, timestamp, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        message.id,
        message.conversationId,
        message.role,
        message.content,
        message.timestamp,
        JSON.stringify(message.metadata || {})
      )
      .run()

    // Save to Vectorize for semantic search (if available)
    if (this.vectorize && message.role !== 'system') {
      try {
        // Generate embedding for the message content
        // Note: You would need to use Cloudflare AI to generate embeddings
        // This is a placeholder - implement actual embedding generation
        await this.vectorize.insert([
          {
            id: message.id,
            values: await this.generateEmbedding(message.content),
            metadata: {
              conversationId: message.conversationId,
              role: message.role,
              timestamp: message.timestamp,
            },
          },
        ])
      } catch (error) {
        console.error('Failed to save message to Vectorize:', error)
        // Continue even if vectorize fails
      }
    }
  }

  async getMessages(conversationId: string, limit = 50): Promise<ConversationMessage[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM conversation_messages
         WHERE conversation_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .bind(conversationId, limit)
      .all()

    return (result.results || []).reverse().map((row: any) => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }))
  }

  async searchMessages(
    conversationId: string,
    query: string,
    limit = 10
  ): Promise<ConversationMessage[]> {
    if (!this.vectorize) {
      // Fallback to basic text search in D1
      const result = await this.db
        .prepare(
          `SELECT * FROM conversation_messages
           WHERE conversation_id = ? AND content LIKE ?
           ORDER BY timestamp DESC
           LIMIT ?`
        )
        .bind(conversationId, `%${query}%`, limit)
        .all()

      return (result.results || []).map((row: any) => ({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role,
        content: row.content,
        timestamp: row.timestamp,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      }))
    }

    // Use Vectorize for semantic search
    try {
      const queryEmbedding = await this.generateEmbedding(query)
      const results = await this.vectorize.query(queryEmbedding, {
        topK: limit,
        filter: { conversationId },
      })

      // Fetch full messages from D1 using the IDs from Vectorize
      const messageIds = results.matches.map((match: any) => match.id)
      if (messageIds.length === 0) return []

      const placeholders = messageIds.map(() => '?').join(',')
      const result = await this.db
        .prepare(
          `SELECT * FROM conversation_messages
           WHERE id IN (${placeholders})
           ORDER BY timestamp DESC`
        )
        .bind(...messageIds)
        .all()

      return (result.results || []).map((row: any) => ({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role,
        content: row.content,
        timestamp: row.timestamp,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      }))
    } catch (error) {
      console.error('Vectorize search failed, falling back to D1:', error)
      // Fallback to D1 text search
      return this.searchMessages(conversationId, query, limit)
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    // Delete from D1
    await this.db
      .prepare('DELETE FROM conversation_messages WHERE conversation_id = ?')
      .bind(conversationId)
      .run()

    // Delete from Vectorize (if available)
    if (this.vectorize) {
      try {
        // Note: Vectorize doesn't have a bulk delete by metadata filter yet
        // You would need to query first, then delete by IDs
        const messages = await this.getMessages(conversationId, 1000)
        const ids = messages.map((m) => m.id)
        if (ids.length > 0) {
          await this.vectorize.deleteByIds(ids)
        }
      } catch (error) {
        console.error('Failed to delete from Vectorize:', error)
      }
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // This is a placeholder - implement actual embedding generation using Cloudflare AI
    // Example: Use @cf/baai/bge-base-en-v1.5 model
    // For now, return a dummy embedding
    return new Array(768).fill(0).map(() => Math.random())
  }
}

export function createMemoryStore(
  db: D1Database,
  vectorize?: VectorizeIndex
): MemoryStore {
  return new D1MemoryStore(db, vectorize)
}

// SQL schema for D1 database
export const MEMORY_SCHEMA = `
CREATE TABLE IF NOT EXISTS conversation_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_timestamp ON conversation_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversation_timestamp ON conversation_messages(conversation_id, timestamp);
`
