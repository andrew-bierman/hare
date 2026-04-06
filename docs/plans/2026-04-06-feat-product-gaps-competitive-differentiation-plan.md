---
title: "Product Gap Analysis & Competitive Differentiation"
type: feat
status: active
date: 2026-04-06
---

# Product Gap Analysis & Competitive Differentiation

## Overview

Comprehensive analysis of Hare's current capabilities vs. the competitive landscape, identifying high-impact product gaps that leverage Cloudflare's infrastructure moat. The goal is to shift Hare from "another agent builder" to "the agent infrastructure platform" -- features competitors can't replicate because they don't run on Cloudflare.

## Current State (Baseline)

| Category | Current State |
|----------|--------------|
| Agent runtime | Durable Object-based stateful agents on Cloudflare edge |
| Models | 14 models (3 Anthropic, 2 OpenAI, 9 free Workers AI) |
| Tools | 61+ system tools across 12 categories |
| Templates | 5 pre-built agent templates |
| Deployment | One-click deploy to 300+ edge locations |
| Embed | Iframe chat widget with theme customization |
| MCP | Full Model Context Protocol server |
| Memory | Vectorize-based semantic memory |
| Scheduling | Cron + one-time scheduled tasks |
| Webhooks | Event subscriptions with delivery tracking |
| Analytics | Token/cost/request tracking, per-agent breakdown |
| Collaboration | Workspaces, roles (owner/admin/member/viewer), invites |
| Billing | Free/Pro($29)/Team($99)/Enterprise via Stripe |
| Audit | Full audit logging with IP tracking |
| Versioning | Agent version history with rollback |

**Core strength**: Deep Cloudflare integration means free AI models, global edge deployment, and native access to KV/R2/D1/Vectorize/Browser without external API costs.

## Competitive Landscape

| Competitor | Strength | Weakness |
|-----------|----------|----------|
| **OpenAI GPTs/Assistants** | Brand, model quality, massive distribution | Locked to OpenAI, no edge deploy, limited tools |
| **Dify.ai** | Visual workflow builder, RAG pipeline, open-source | No edge deployment, self-host complexity |
| **Voiceflow** | Conversation design, enterprise voice | Expensive, complex, no developer-first experience |
| **Botpress** | Visual builder, NLU, open-source | Heavy, not edge-native, dated UX |
| **Relevance AI** | No-code tool builder, chains | No stateful agents, no edge deploy |
| **CrewAI/AutoGen** | Multi-agent orchestration | Framework-only (no hosted platform), Python-only |
| **n8n + AI** | Visual workflows, 400+ integrations | AI is bolted on, not agent-native |
| **Flowise/Langflow** | Visual LangChain builder | Fragile, self-host only, no production runtime |
| **Stack AI** | Enterprise workflows, SOC2 | Expensive, slow, not developer-friendly |

**Hare's position**: Developer-friendly agent platform with unmatched Cloudflare-native infrastructure, but the feature set looks similar to competitors from a user's perspective. The infrastructure advantages (free models, edge deploy, Durable Objects) are invisible to users until they experience them.

## Priority Roadmap

| Priority | Feature | Impact | Effort | Status |
|----------|---------|--------|--------|--------|
| P0 | Knowledge Base / RAG pipeline | Critical | Medium | **Shipped** (schema + API + UI in PR #333) |
| P0 | Conversation feedback | High | Small | **Shipped** (schema + API + UI in PR #333) |
| P0 | Conversation starters | High | Small | **Shipped** (agent field + UI in PR #333) |
| P0 | Instruction snippets / prompt library | High | Small | **Shipped** (18 snippets + UI in PR #333) |
| P1 | Guardrails & safety | High | Medium | **Shipped** (schema + API + UI in PR #333) |
| P1 | Event-driven triggers | High | Medium | Planned |
| P1 | Agent evaluation framework | High | Medium | Planned |
| P2 | Multi-agent workflows | Transformative | Large | Planned |
| P2 | White-label / custom domains | Revenue | Medium | Planned |
| P2 | Business analytics | High | Small | Planned |
| P3 | Visual workflow builder | Accessibility | Large | Planned |

---

## Phase 1: Shipped (PR #333)

### 1A. Message Feedback (Thumbs Up/Down)

**Problem**: No way to know if an agent's responses are good. Analytics only track tokens and costs.

**Solution**: Thumbs up/down feedback on every assistant message, with aggregated satisfaction analytics per agent.

**Implementation**:
- `message_feedback` table: messageId, conversationId, agentId, rating (positive/negative), comment
- API routes: create feedback, get stats (satisfaction rate over time), delete
- `FeedbackButtons` widget: inline thumbs up/down after assistant messages
- `FeedbackStats` API: aggregated positive/negative counts, satisfaction percentage

**Files**:
- `packages/db/src/schema/message-feedback.ts`
- `packages/api/src/schemas/feedback.ts`
- `packages/api/src/orpc/routers/feedback.ts`
- `packages/app/widgets/message-feedback/`

### 1B. Knowledge Base / RAG Pipeline

**Problem**: Table-stakes gap. Every competitor has document upload + RAG. Hare has the infra (R2, Vectorize, Workers AI BGE) but no user-facing pipeline.

**Solution**: Knowledge base collections that agents can search. Upload documents or URLs, auto-chunk and embed, store in Vectorize.

**Implementation**:
- `knowledge_bases` table: workspace-scoped collections
- `documents` table: tracks uploads (PDF, TXT, MD, CSV, DOCX, HTML, JSON, URL) with processing status
- `document_chunks` table: individual text segments with Vectorize vector IDs
- `agent_knowledge_bases` junction: links agents to KBs
- API routes: CRUD for KBs, add URL docs, list docs, link/unlink agents
- `KnowledgeBaseManager` widget: create KB, view docs, manage

**Processing pipeline** (TODO - async worker):
1. Upload to R2
2. Extract text (Workers AI or client-side)
3. Chunk text (recursive character splitting)
4. Generate embeddings via Workers AI BGE
5. Store vectors in Vectorize
6. Update document status to `ready`

**Files**:
- `packages/db/src/schema/knowledge-base.ts`
- `packages/api/src/schemas/knowledge-base.ts`
- `packages/api/src/orpc/routers/knowledge-base.ts`
- `packages/app/widgets/knowledge-base/`

### 1C. Guardrails & Safety

**Problem**: No content filtering, PII detection, or output validation. Enterprise gate-keeper.

**Solution**: Per-agent configurable safety rules with 6 types and 4 actions.

**Guardrail types**:
- `content_filter`: Block harmful/inappropriate content (Workers AI classification)
- `topic_restriction`: Limit agent to specific topics
- `pii_protection`: Detect and redact PII (SSN, credit cards, emails)
- `prompt_injection`: Detect prompt injection attempts
- `output_validation`: Ensure responses meet format/length requirements
- `word_filter`: Block specific words or regex patterns

**Actions**: block, warn, redact, log

**Implementation**:
- `guardrails` table: per-agent rules with type-specific config
- `guardrail_violations` table: logs when rules trigger (for analytics)
- API routes: CRUD for guardrails, list violations
- `GuardrailsPanel` widget: enable/disable, add rules, configure actions
- Agent schema extended with `guardrailsEnabled` boolean

**Files**:
- `packages/db/src/schema/guardrails.ts`
- `packages/api/src/schemas/guardrails.ts`
- `packages/api/src/orpc/routers/guardrails.ts`
- `packages/app/widgets/guardrails-config/`

### 1D. Instruction Snippets / Prompt Library

**Problem**: Blank-page problem when writing agent instructions.

**Solution**: 18 pre-built instruction blocks across 6 categories that users can mix and match.

**Categories**:
- **Persona** (3): Friendly Assistant, Professional Expert, Concise Responder
- **Behavior** (3): Ask Clarifying Questions, Step-by-Step Reasoning, Escalation Handling
- **Format** (3): JSON Output, Markdown Formatting, Source Citations
- **Safety** (3): Stay on Topic, PII Protection, Honest About Limitations
- **Tone** (3): Casual & Friendly, Formal & Business, Empathetic & Supportive
- **Domain** (3): E-commerce Context, SaaS Product Context, Healthcare Context

**Implementation**:
- `packages/config/src/snippets.ts`: All snippet definitions
- `SnippetPicker` dialog widget: tabbed category view, click to insert

**Files**:
- `packages/config/src/snippets.ts`
- `packages/app/widgets/instruction-snippets/`

### 1E. Conversation Starters

**Problem**: End-users don't know what to ask when chat widget loads.

**Solution**: Agents define up to 6 suggested first messages shown as clickable badges.

**Implementation**:
- `conversationStarters` JSON field on agents table (array of strings)
- Added to Create/Update agent schemas with validation (max 6, max 200 chars each)
- `ConversationStarters` widget: renders badges in chat empty state

**Files**:
- `packages/db/src/schema/agents.ts` (new field)
- `packages/api/src/schemas/agents.ts` (schema update)
- `packages/app/widgets/conversation-starters/`

---

## Phase 2: Event-Driven Triggers (Planned)

**Problem**: Agents only respond to direct chat or cron schedules. No way to trigger from external events.

**What transforms**: Agents go from "chatbots you talk to" to "autonomous workers that react to your business."

**Cloudflare advantage**: Email Workers, Queues, R2 event notifications are native primitives.

### Proposed Implementation

**Trigger types**:
- Inbound webhook (per-agent endpoint)
- Inbound email (Cloudflare Email Workers → agent DO)
- R2 file upload event
- Scheduled (already exists)
- Queue message

**Schema**:
- `agent_triggers` table: agentId, type, config, enabled, status
- `trigger_executions` table: history with status, duration, result

**UI**:
- Trigger configuration panel on agent detail page
- Trigger history/monitoring view
- Per-trigger URL/email address display

---

## Phase 3: Agent Evaluation Framework (Planned)

**Problem**: No way to systematically test or measure agent quality. Enterprise blocker.

**No competitor does this well yet** -- opportunity to lead.

### Proposed Implementation

**Schema**:
- `agent_test_cases` table: agentId, input, expectedBehavior, evaluationCriteria
- `agent_test_runs` table: batch execution with pass/fail/score
- `agent_test_results` table: per-case results with LLM-as-judge scores

**Features**:
- Test case editor (input → expected output → evaluation criteria)
- Batch evaluation runner (run N test cases, score with LLM-as-judge)
- Evaluation dashboard (pass rate, quality trends, regressions)
- Side-by-side comparison (Config A vs Config B)
- Pre-deploy gate: "all tests must pass before deploying"
- A/B testing with traffic splitting

---

## Phase 4: Multi-Agent Workflows (Planned)

**Problem**: Each agent operates in isolation. No orchestration.

**Cloudflare moat**: Durable Objects enable DO-to-DO communication natively. No message bus needed.

### Proposed Implementation

**Patterns to support**:
- Sequential chains: Agent A → Agent B → Agent C
- Router: Triage agent routes to specialist agents
- Supervisor: Manager delegates to workers, synthesizes
- Parallel: Multiple agents work simultaneously

**Schema**:
- `workflows` table: name, config (node graph), status
- `workflow_nodes` table: agentId, position, connections
- `workflow_executions` table: runtime state, results

**New tool**: `send_message_to_agent` for agent-to-agent communication

**UI**: Visual workflow canvas (React Flow or similar) with agent nodes

---

## Phase 5: White-Label & Custom Domains (Planned)

**Problem**: Embed widget has Hare branding. Agencies want their own brand.

**Cloudflare advantage**: Cloudflare for SaaS handles custom domains + TLS at ~$0 marginal cost.

### Proposed Implementation

- Custom domain mapping (CNAME → Cloudflare for SaaS)
- Brand removal from chat widget
- Custom CSS/theme injection
- Custom auth integration (SSO, JWT verification)
- API-only mode (headless)

---

## Strategic Positioning

### Don't compete on "agent builder" -- compete on "agent infrastructure"

1. **"The only agent platform where AI runs free"** -- Workers AI at $0
2. **"Agents that live at the edge"** -- <50ms globally, stateful via Durable Objects, no cold starts
3. **"From chatbot to autonomous worker"** -- Triggers + scheduling + multi-agent
4. **"Your agents, your infrastructure"** -- White-label, API-first

### The "Only Hare Can Do This" List

| Capability | Why Only Hare |
|-----------|---------------|
| Free AI inference at scale | 9 Workers AI models at $0 |
| Stateful agents at the edge | Durable Objects, no server |
| Native multi-agent orchestration | DO-to-DO communication |
| Zero-latency guardrails | Edge classification, same request |
| Email-triggered agents | Cloudflare Email Workers |
| RAG at $0 | R2 + Workers AI embeddings + Vectorize |
| Infinite white-label | Cloudflare for SaaS at marginal $0 |

---

## Quick Wins Still Available

| Win | Effort | Impact |
|-----|--------|--------|
| Agent cloning across workspaces (JSON export/import) | Small | Foundation for marketplace |
| Public agent status page (uptime, latency) | Small | Builds end-user trust |
| Business analytics (resolution rate, handoff rate) | Small-Medium | Shifts to business tool |
| Alerting ("satisfaction dropped 20% this week") | Small | Proactive quality management |
