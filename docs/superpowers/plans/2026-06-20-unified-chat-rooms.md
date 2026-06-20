# Unified Chat Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inquiry-based replies with one shared buyer/agent and agent/agent chat-room system.

**Architecture:** Existing `conversations` and `messages` remain the chat source of truth. `conversations` gains ordered participant columns and a type, while `messages` is constrained by RLS so a sender can only message the other room participant. Buyer dashboard, agent dashboard, property contact, and a new `/messages` screen use the same hook and UI path.

**Tech Stack:** React, TanStack Router, React Query, Supabase Postgres/RLS, Playwright smoke test.

---

### Task 1: Write Failing Unified Chat Smoke Test

**Files:**
- Modify: `scripts/e2e-smoke.mjs`

- [ ] Replace buyer inquiry assertions with checks that property contact creates a `conversations` row and initial `messages` row.
- [ ] Replace agent reply flow with `/messages?conversation=<id>` reply assertions.
- [ ] Add a second agent account and assert agent-to-agent direct chat creates a direct conversation and two messages.
- [ ] Run `npm run test:e2e:smoke`.
- [ ] Expected result before implementation: failure because the app still writes contact messages through `inquiries` and the `/messages` route does not exist.

### Task 2: Add Conversation Participant Schema

**Files:**
- Create: Supabase migration via `supabase migration new unified_chat_rooms`
- Modify: generated migration SQL
- Modify: `supabase/schema.sql`

- [ ] Add `conversation_type`, `participant_a_id`, `participant_b_id`, and `created_by` to `public.conversations`.
- [ ] Backfill participants from existing `user_id` and `agent_id`.
- [ ] Make `property_id` nullable for direct agent-to-agent chats.
- [ ] Replace old uniqueness with property/direct unique indexes using ordered participants.
- [ ] Replace conversation/message RLS policies so only room participants and admins can read/write, and messages cannot be self-addressed.
- [ ] Apply migration to the linked Supabase project and verify with direct SQL queries.

### Task 3: Rewrite Chat Hooks

**Files:**
- Modify: `src/hooks/useMessages.ts`

- [ ] Fetch conversations by participant columns.
- [ ] Derive `other_user` from room participants, not legacy buyer/agent fields.
- [ ] Create or reuse property/direct conversations using ordered participants.
- [ ] Send initial messages and normal messages with explicit opposite participant IDs.
- [ ] Invalidate `conversations` and `messages` queries after writes.

### Task 4: Build Shared Messages UI

**Files:**
- Create: `src/routes/_authenticated/messages.tsx`
- Modify: `src/components/chat/ChatModal.tsx`
- Modify: `src/components/layout/Navbar.tsx`

- [ ] Add `/messages` with a room list, message pane, send box, and agent-to-agent starter.
- [ ] Fix `ChatModal` so it receives `receiverId` instead of guessing from the last message.
- [ ] Add authenticated navigation to Messages on desktop, mobile, and account dropdown.

### Task 5: Remove Buyer/Agent Inquiry Reply Surfaces

**Files:**
- Modify: `src/routes/property.$id.tsx`
- Modify: `src/routes/_authenticated/dashboard.tsx`
- Modify: `src/routes/_authenticated/agent.tsx`
- Optionally modify: `src/routes/_authenticated/agent/inquiries.tsx`

- [ ] Property contact should create/open a conversation and navigate to `/messages`.
- [ ] Buyer dashboard should show recent chat rooms, not inquiry reply threads.
- [ ] Agent dashboard should link to and summarize chat rooms, not create replies from `inquiries`.

### Task 6: Verify End To End

**Commands:**
- `npm run build`
- `npm run lint`
- `npm run test:e2e:smoke`
- `supabase db advisors --linked --type performance`
- `supabase db advisors --linked --type security`

- [ ] Fix any failures caused by the redesign.
- [ ] Report remaining warnings separately from passing behavior.
