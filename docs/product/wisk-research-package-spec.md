# WISK — Research / Research Pro package spec

Reference document, not yet a Cursor implementation prompt. Each piece below gets its own build brief once it's ready to start. Origin: inspired by an Instagram reel's "multi-agent OS" concept, deliberately reworked to fit WISK's actual principles rather than copied — see the earlier analysis for what was explicitly rejected (fake multi-agent theater, exposed infra chrome, unreviewed autonomous action).

## Positioning

A new two-tier package — **Research** (£19/month) and **Research Pro** (£39/month) — following the same shape as `properties`/`properties_pro`. One Winston, given new capabilities and two new data sources, not a second AI or a separate agent. Gated behind `ai_access`-style entitlement like every other Winston surface — nothing here is free.

Pricing set against Perplexity Pro ($20/mo) as the direct quality-bar benchmark and WISK's own Properties Pro (£32/mo) as the internal anchor — Research sits just under Perplexity's price point since it's the narrower base tier, Research Pro sits above both, justified by data fusion (leads, deals, content history) and proposal integration nothing else in the market offers. Enterprise competitive-intelligence tools (Klue, Crayon — $14k-60k/year) were checked and explicitly ruled out as a reference point — wrong buyer entirely, not WISK's market.

## Sequencing — what this depends on, and what depends on it

1. **Focus** (the renamed signals feed) should exist before Research ships, since Research's competitor signals need somewhere to surface.
2. **Vercel Pro** — needed for the background research job pattern (Hobby's function duration is too short for real multi-source synthesis) and for more-frequent-than-daily competitor checks.
3. **Supabase Pro** — already active; storage capacity confirmed available (100GB, currently unused) — not a blocker for Research specifically, more directly relevant to task attachments, but worth having provisioned either way.
4. Independent of this track: recurring calendar events (the real remaining Phase 2 item) and task attachments (now unblocked by Supabase Pro) can proceed in parallel — no dependency either direction.

## Focus (Overview signals surface)

- **Free tier:** aggregates existing flags/insights Winston already generates elsewhere (Pipeline Health stalled-lead flags, Digest insights, Properties alerts, and Research competitor signals once subscribed) into one list on Overview. Filtered to only the packages the user actually has — no Properties items without Properties, no Research items without Research. Pure surfacing, no new generation.
- **Paid tier:** Winston reasons across the aggregated items together and produces an actual suggestion/plan, not just a longer list — same free=lightweight/paid=full shape the morning briefing already uses.

## Research (base tier)

- **Lead intelligence briefs** — before a call, Winston generates a company background / budget-signal / pain-point brief for the lead, sourced through the search-API layer (not scraping). Lives in the existing lead detail view, alongside call-notes and draft-email — not a new destination.
- **Competitor watchlist** — user adds competitor names/URLs; periodic checks for meaningful public changes (new content, pricing shifts, review activity); meaningful changes surface as signals in Focus, labeled by source. Includes a location layer via Google Places/Maps API (properly licensed, not scraped) — tracks a competitor's rating trend, new reviews, and whether they've opened a new location near the user, alongside the website/content-level monitoring Tavily already covers.
- **Basic dashboard** — win-rate analytics from data already collected (lead status Won/Lost + value history), simple benchmarking. No new tables needed beyond what tracks the watchlist itself.

## Research Pro

- **Open-ended research chat** — ask any market/competitor/business question, get a synthesized, cited answer pulling from multiple sources. Citations are mandatory on every claim — same discipline already enforced everywhere else in WISK (`attachSourceValues`, no AI-restated figures without a real source), applied to research sources instead of financial data.
- **Tool architecture** — Claude does the synthesis (consistency with every other Winston surface, reuses existing timeout/prompt-caching infra); Tavily and Exa are both available as tools, and Claude routes per-question rather than committing to one vendor. Guidance embedded in the system prompt: Tavily for real-time facts and current events, Exa for company/people background specifically, both when a question genuinely needs both (e.g. "research this competitor"). Avoid reflexively calling both for questions one tool clearly answers alone.
- **Usage tracking** — both Tavily and Exa calls logged the same way `ai_usage_log` already tracks Anthropic calls, so there's real visibility into vendor usage and free-tier headroom, not just a bill at the end of the month.
- **Deeper competitor monitoring** than base tier — more competitors tracked, higher check frequency (needs Vercel Pro's per-minute cron precision, not Hobby's once-daily minimum).
- **Findings become actions, reviewed not auto-committed** — a competitor pricing shift can propose a content angle; a market insight can propose a talking point for a specific lead. Routes through the existing `WinstonProposal` review→commit loop exactly like every other proposal in the app. This is the part that makes it distinctly WISK rather than a bolted-on research tool.
- **Background job pattern** — genuine multi-source research can take longer than a synchronous chat reply should block on. Long-running queries run async, notify by email via the existing Resend infra when complete — same "generate now, review later" shape already used elsewhere (proposals, morning briefing).

## Explicit guardrails (carried over from the original inspiration review — still apply)

- No literal separate agents/models per role. One Winston, enriched.
- No custom web scraping. Tavily/Exa/Google Places are licensed data services built for this; nothing gets scraped in-house.
- No autonomous unreviewed action. Research proposes; a human still reviews and commits, same as everything else.
- No exposed infra/ops chrome. This is for landlords, freelancers, and creators — not a server-health dashboard.
- **LinkedIn is explicitly out of scope, deliberately, not an oversight.** Official API access requires LinkedIn's Marketing Developer Platform (~5% approval rate, 6-month wait, $699+/month once approved) — impractical at this stage. Scraping around it is worse than impractical: LinkedIn's terms prohibit automated collection of even public data, and they enforce it — LinkedIn sued Proxycurl, a well-established LinkedIn data provider, in January 2025; Proxycurl shut down entirely by mid-2025. Don't revisit this without a real reason to believe the calculus has changed.

## Unit economics & usage caps

Real per-call costs, so package limits can be set with actual margins in mind rather than guessed:

| Source | Cost | Used for |
|---|---|---|
| Tavily search | ~$0.008 (basic) / ~$0.016 (advanced) per call | Real-time web grounding, competitor content monitoring |
| Exa search | ~$0.007 per call (with contents) | Company/people lookups, lead intelligence briefs |
| Google Places/Maps | ~$0.034 per full business lookup | Location-based competitor tracking (ratings, reviews, new locations) |

All three have free tiers (Exa: 20,000 requests/month; Tavily: 1,000 credits/month) that likely cover Research entirely at current usage volumes — but caps should still exist per tier so a heavy user can't silently blow past margins as usage grows. Framework: soft monthly caps per feature (e.g. number of competitors trackable, check frequency, number of lead briefs, number of open-ended Research Pro queries), enforced and monitored the same way `ai_usage_log` already tracks everything else.

With pricing now set at £19/£39, the margin picture is comfortable: even a generous allowance of, say, 100 combined API calls/month at blended ~$0.01-0.03 each is roughly $1-3 in raw data costs against £19-39 in revenue — before Anthropic's own token costs, which is the larger of the two cost lines but already has established tiering discipline (Haiku vs Sonnet) applied everywhere else. Exact caps still worth finalizing with real usage data once this ships, but there's real room to be generous rather than stingy with limits at this price point.

## Calibration on ambition

Perplexity is the quality bar to work toward, not a feature-parity target on day one. Matching their exact polish immediately isn't realistic for a single package inside a broader product — building on the same underlying pattern (search API + synthesis + citations), scoped to a small business's actual questions, with room to improve over time, is the realistic and still genuinely valuable version of this.
