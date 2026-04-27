# Quoter — Project Brief

> This file is the living source of truth for Claude Code sessions. Update it at the end of each session or when decisions are made.

---

## What it is

Quoter is a SaaS quoting tool for Dutch builders (aannemers). It helps users create quotes and improve their price accuracy over time by comparing quoted vs actual costs per line item.

**Core loop:** Make quote → Do the work → Enter actual costs → Learn where you over/under-estimated → Get better over time.

---

## Company & Team

| Role | Who |
|------|-----|
| CEO | Didric (user) |
| MD | Claude |
| HR | Jim |
| Engineering | Ravi |
| Product | Cass |
| Customer Experience | Leo |
| Marketing | Tove |

**Feedback loop:** Partner (construction industry) → CEO → product ideas → MD → team execution

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) / TypeScript |
| Database | Supabase (project: `uobaibqwoarcvdmvqubm`) |
| Hosting | Vercel (project: `quoter-bcjg`) |
| Payments | Stripe (test mode — not yet live) |
| Automation | n8n (MCP connected) |
| Messaging | Twilio WhatsApp + Postmark (email) |

---

## Current Status

- **Phase 1 complete:** actual cost input, line-item comparison, `completed` status
- **2 test users** on the platform (on `business` tier — exempt from freemium gate)
- Stripe still in test mode
- n8n MCP installed — starting to build automation workflows
- Referral DB schema briefing: done (columns added to `profiles` in previous session)
- Onboarding wizard + welcome flow + email tracking: next up

---

## Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Actual costs input + comparison per line item | ✅ Built |
| 2 | Category-level comparison + PDF export | Planned |
| 3 | Multi-project trend dashboard | Idea |
| 4 | AI correction factors per user/category | Idea |
| 5 | Anonymous benchmarking across users | Idea |
| — | Upload & compare competitor/old quotes (AI) | Idea |

---

## Data Model (key fields)

- Quote line items: `json_data.result.lines[]`
- Actual cost per line: `json_data.result.lines[].actual_cost`
- Quote statuses: `draft`, `final`, `completed`
- No extra tables — everything lives in Firestore documents

---

## Principles

1. Keep it simple — each phase must deliver value on its own
2. No premature complexity — only build when there's data/demand
3. Reuse existing structure — no new tables unless strictly necessary
4. User-first — only build features that are actually used

---

## Active Work

### n8n Onboarding + Communication Flows (current session — 2026-04-08)

Source briefing: `03 Claude files/quoter_communicatie_briefing.md`

Three flows:
1. **Onboarding wizard** (`/onboarding` route — 3-step wizard, collect opt-ins)
2. **Welcome flow** (n8n webhook `/onboarding-complete` → WhatsApp/email routing)
3. **Referral flow** (n8n webhook on `quotes` INSERT → channel-aware nudges)

Channel logic:
- WhatsApp only → all via Twilio
- Email only → all via Postmark
- Both → email first, escalate to WhatsApp after 48h if not opened

**Status:** ✅ Complete — code + n8n flows + Supabase triggers all live.

**Delivered:**
- `src/lib/migration-onboarding.sql` — run ✅ (Supabase)
- `src/app/onboarding/page.tsx` + `layout.tsx` — 3-step wizard
- `src/app/(dashboard)/layout.tsx` — onboarding redirect for free tier
- `src/lib/types.ts` — Profile type updated with freemium fields
- `src/lib/usage-limits.ts` — freemium gate (lifetime quota for free tier)
- `src/app/(auth)/login/page.tsx` — referral `?ref=` handling on signup
- n8n welcome flow (`/onboarding-complete`) — WhatsApp + email + escalation + Joram alert ✅
- n8n email-opened webhook (`/email-opened`) → Supabase `email_opened` ✅
- n8n referral flow (quotes INSERT → trigger A/B/C) ✅
- Supabase `notify_onboarding_complete` function updated with live webhook URL ✅

---

## Session Log

| Date | What happened |
|------|--------------|
| 2026-04-08 | Built full onboarding + freemium engine (code side). SQL migration run in Supabase. n8n MCP path fixed in .claude.json (wrong project key — now under `quoter` path). n8n workflows next session. |
| 2026-04-08 | n8n flows built: welcome flow (3 channel paths), email-opened webhook, referral flow (triggers A/B/C). Supabase trigger updated with live webhook URL. Full onboarding engine live. |
