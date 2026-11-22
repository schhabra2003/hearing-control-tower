# Research: tech costs and reliability (research report, prices seen 2026-11-17)
LLM per 1M tokens (in/out): Claude Haiku 5.5 $0.10/$0.50; Sonnet 5.5 $2/$10; Opus 5.5 $4/$20; batch -50%. platform.claude.com/docs/en/about-claude/pricing
 -> ~3k in + 500 out per message: Haiku ~$0.0006, Sonnet ~$0.011 (arithmetic; thinking tokens extra).
Workflows: Temporal Cloud $50/1M actions (+plan); Inngest Pro from $99/mo; Trigger.dev $10-50/mo; AWS Step Functions $25/1M transitions.
Messaging: Twilio US SMS $0.0083/segment + carrier fee $0.0035-0.005; MMS $0.022 out; number $1.15/mo; A2P 10DLC brand $4-44 one-time, vetting $15, campaign $1.50-10/mo, approval ~1 week. Postmark $15/mo for 10k emails (in+out). Gmail API free under quota.
Voice: Deepgram Nova-3 $0.0048/min; OpenAI transcribe $0.003-0.0045/min; Retell AI voice agents $0.07-0.31/min. 13 all-party-consent recording states (CA, CT, DE, FL, IL, MD, MA, MT, NV, NH, OR, PA, WA). FCC-24-17: AI voices are "artificial" under TCPA -> consent needed for calls to residential/wireless lines.
E-sign: BoldSign $30/mo (40 envelopes) +$0.75; DocuSign API $50/mo (40). ESIGN/UETA valid in 47 states+DC, but counties may require wet ink/notarization (Harris affidavits).
Mail scanning: Stable $49/mo (30 pieces), API + webhooks. AWS Textract $1.50/1k pages.
Ops UI: Retool Team $10/builder, $5/internal user per month.
Reliability: never let the LLM write state; verify quoted spans; idempotency keys + outbox for sends; email push notifications can drop -> periodic resync; dedupe on Message-ID; 10DLC must be registered or carriers filter.
UNVERIFIED: Temporal SLA %, Inngest/Trigger SLAs, LLM extraction-accuracy benchmarks, Airtable/Clio/Salesforce prices, county e-sign rules.

## Agent design guidance (verified 2026-11-17)
Anthropic, "Building effective agents", published Dec 19, 2024. https://www.anthropic.com/research/building-effective-agents
- "Workflows are systems where LLMs and tools are orchestrated through predefined code paths. Agents, on the other hand, are systems where LLMs dynamically direct their own processes and tool usage."
- "we recommend finding the simplest solution possible, and only increasing complexity when needed."
