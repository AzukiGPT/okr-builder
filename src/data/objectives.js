export const OBJECTIVES = {
  sales: [
    { id: "S1", title: "Generate new ARR and hit the revenue target", when: "Always relevant — use every year", stages: ["E","G","S"], btlnk: ["all"], krs: [
      { id: "S1.1", text: "New ARR closed", type: "Lagging", funnel: "revenue" },
      { id: "S1.2", text: "New enterprise deals closed", type: "Lagging", funnel: "deals" },
      { id: "S1.3", text: "Win rate on qualified opportunities ≥ X%", type: "Lagging", funnel: "winrate" },
      { id: "S1.4", text: "Average sales cycle ≤ X days", type: "Lagging" },
    ]},
    { id: "S2", title: "Build a repeatable sales motion without founder dependency", when: "When founder closes most deals", stages: ["E","G"], btlnk: ["pipeline_low","pmf"], krs: [
      { id: "S2.1", text: "% of deals closed without founder involvement ≥ 60%", type: "Lagging" },
      { id: "S2.2", text: "AE playbook documented and deployed — by Q2", type: "Leading" },
      { id: "S2.3", text: "Average ramp time to first deal for new AEs < 60 days", type: "Lagging" },
    ]},
    { id: "S3", title: "Shorten the sales cycle and increase deal velocity", when: "When pipeline is healthy but deals are slow to close", stages: ["G","S"], btlnk: ["pipeline_low"], krs: [
      { id: "S3.1", text: "Average sales cycle ≤ X days", type: "Lagging" },
      { id: "S3.2", text: "% of deals with confirmed next step ≥ 90%", type: "Leading" },
      { id: "S3.3", text: "Stalled deals (>30 days no activity) < X", type: "Leading" },
    ]},
    { id: "S4", title: "Improve win rate on qualified opportunities", when: "When pipeline is large but conversion is low", stages: ["E","G","S"], btlnk: ["pipeline_low"], krs: [
      { id: "S4.1", text: "Win rate on MEDDICC-qualified deals ≥ X%", type: "Lagging" },
      { id: "S4.2", text: "Average MEDDICC score at proposal stage ≥ 4/6", type: "Leading" },
      { id: "S4.3", text: "% of lost deals with documented reason in CRM = 100%", type: "Leading" },
    ]},
    { id: "S5", title: "Build a pipeline independent from any single source", when: "When ≥60% of pipeline comes from one channel", stages: ["E","G"], btlnk: ["no_pipeline"], krs: [
      { id: "S5.1", text: "≥ 3 pipeline sources each contributing ≥ 15%", type: "Lagging" },
      { id: "S5.2", text: "Marketing-sourced pipeline ≥ 40% of total", type: "Lagging" },
      { id: "S5.3", text: "Pipeline coverage maintained ≥ 3× ARR target", type: "Leading" },
    ]},
    { id: "S6", title: "Enter a new geographic market", when: "When domestic market is saturating", stages: ["G","S"], btlnk: ["brand_unknown"], krs: [
      { id: "S6.1", text: "≥ 1 paying customer signed in target market", type: "Lagging" },
      { id: "S6.2", text: "Average deal size in new market ≥ €Xk", type: "Lagging" },
      { id: "S6.3", text: "≥ 20 MEDDICC-qualified accounts in target", type: "Leading" },
    ]},
    { id: "S7", title: "Move upmarket — increase average contract value", when: "When current ICP is too small to scale", stages: ["G","S"], btlnk: ["not_profitable"], krs: [
      { id: "S7.1", text: "Average deal size increases from €Xk to €Yk", type: "Lagging" },
      { id: "S7.2", text: "% of pipeline from 500+ employee accounts ≥ X%", type: "Leading" },
      { id: "S7.3", text: "≥ X enterprise deals (>€Xk) closed this year", type: "Lagging" },
    ]},
    { id: "S8", title: "Build a partner and channel sales engine", when: "When direct sales is expensive to scale", stages: ["G","S"], btlnk: ["not_profitable"], krs: [
      { id: "S8.1", text: "≥ X active partners generating qualified pipeline", type: "Leading" },
      { id: "S8.2", text: "Partner-sourced revenue ≥ X% of total ARR", type: "Lagging" },
    ]},
    { id: "S9", title: "Build a predictable outbound SDR machine", when: "When inbound is insufficient for growth", stages: ["E","G"], btlnk: ["no_pipeline"], krs: [
      { id: "S9.1", text: "SDRs generate ≥ X qualification meetings/month", type: "Leading", funnel: "meetings_monthly" },
      { id: "S9.2", text: "Connect rate ≥ X% on outbound calls", type: "Leading" },
      { id: "S9.3", text: "SDR-sourced pipeline ≥ €XM/quarter", type: "Lagging" },
    ]},
    { id: "S10", title: "Reduce customer acquisition cost (CAC)", when: "When unit economics are deteriorating", stages: ["S"], btlnk: ["not_profitable"], krs: [
      { id: "S10.1", text: "Sales CAC decreases by X% year-over-year", type: "Lagging" },
      { id: "S10.2", text: "CAC payback period < X months", type: "Lagging" },
      { id: "S10.3", text: "Revenue per AE increases by X%", type: "Lagging" },
    ]},
    { id: "S11", title: "Improve forecast accuracy and pipeline discipline", when: "When revenue is unpredictable quarter-to-quarter", stages: ["G","S"], btlnk: ["pipeline_low"], krs: [
      { id: "S11.1", text: "Forecast vs. actual revenue variance ≤ X% per quarter", type: "Lagging" },
      { id: "S11.2", text: "% of opportunities with updated next step in CRM ≥ 95%", type: "Leading" },
      { id: "S11.3", text: "Pipeline coverage ratio maintained ≥ 3×", type: "Leading" },
    ]},
    { id: "S12", title: "Expand existing accounts through upsell / cross-sell", when: "When installed base is a significant revenue source", stages: ["G","S"], btlnk: ["not_profitable"], krs: [
      { id: "S12.1", text: "Expansion ARR ≥ €X from existing accounts", type: "Lagging" },
      { id: "S12.2", text: "≥ X% of customers purchase an additional module", type: "Lagging" },
    ]},
    { id: "S13", title: "Build a consultative, ROI-led sales approach", when: "When deals are lost on price or ROI narrative is weak", stages: ["E","G","S"], btlnk: ["pipeline_low"], krs: [
      { id: "S13.1", text: "% of proposals with quantified ROI business case ≥ X%", type: "Leading" },
      { id: "S13.2", text: "Sales team satisfaction with enablement tools ≥ 8/10", type: "Lagging" },
      { id: "S13.3", text: "Win rate on deals using ROI calculator vs. not", type: "Lagging" },
    ]},
    { id: "S14", title: "Increase Sales team productivity per headcount", when: "When revenue per AE is stagnating", stages: ["S"], btlnk: ["not_profitable"], krs: [
      { id: "S14.1", text: "Revenue per AE increases by X% year-over-year", type: "Lagging" },
      { id: "S14.2", text: "Ramp time for new AEs < X days to first deal", type: "Lagging" },
      { id: "S14.3", text: "% of AEs hitting quota ≥ X%", type: "Lagging" },
    ]},
    { id: "S15", title: "Build a lighthouse customer in a new vertical", when: "When entering an industry where social proof is required", stages: ["E","G"], btlnk: ["brand_unknown"], krs: [
      { id: "S15.1", text: "≥ 1 lighthouse customer signed in target vertical", type: "Lagging" },
      { id: "S15.2", text: "Lighthouse customer agrees to be a reference + case study", type: "Lagging" },
      { id: "S15.3", text: "≥ 3 opportunities sourced from lighthouse network", type: "Lagging" },
    ]},
    { id: "S16", title: "Reduce late-stage deal loss at proposal and closing", when: "When win rate analysis shows losses concentrate at proposal stage", stages: ["G","S"], btlnk: ["pipeline_low"], krs: [
      { id: "S16.1", text: "% of deals lost at proposal stage or later ≤ X%", type: "Lagging" },
      { id: "S16.2", text: "Champion enablement kit deployed + used in ≥ X% of enterprise deals", type: "Leading" },
      { id: "S16.3", text: "% of proposals with signed security/NDA before Q3 ≥ X%", type: "Leading" },
    ]},
  ],
  marketing: [
    { id: "M1", title: "Make marketing the primary contributor to qualified pipeline", when: "When marketing has no pipeline accountability", stages: ["G","S"], btlnk: ["no_pipeline"], krs: [
      { id: "M1.1", text: "Marketing-sourced MQLs ≥ X% of total MQL volume", type: "Lagging", funnel: "mql_share" },
      { id: "M1.2", text: "Lead-to-MQL conversion rate ≥ 30%", type: "Lagging" },
      { id: "M1.3", text: "Annual MQL target", type: "Lagging", funnel: "mqls" },
      { id: "M1.4", text: "Cost per MQL from organic channels ≤ €X", type: "Lagging" },
    ]},
    { id: "M2", title: "Build a scalable inbound engine from organic channels", when: "When acquisition relies on paid or outbound only", stages: ["E","G","S"], btlnk: ["no_pipeline","brand_unknown"], krs: [
      { id: "M2.1", text: "≥ 60% of MQLs from organic channels", type: "Lagging" },
      { id: "M2.2", text: "Organic traffic grows ×X vs. Q1 baseline", type: "Lagging" },
      { id: "M2.3", text: "≥ 3 organic channels each contributing > 10 MQLs/month", type: "Lagging" },
    ]},
    { id: "M3", title: "Establish category leadership and own the defining narrative", when: "When creating or reframing a market category", stages: ["E","G"], btlnk: ["brand_unknown","pmf"], krs: [
      { id: "M3.1", text: "Page 1 Google ranking on category keyword + 3 associated terms", type: "Lagging" },
      { id: "M3.2", text: "Branded search volume +100% year-over-year", type: "Lagging" },
      { id: "M3.3", text: "Category name mentioned in ≥ X% of new sales opportunities", type: "Leading" },
    ]},
    { id: "M4", title: "Launch a flagship content asset (benchmark report / index)", when: "When you need a single SEO + PR + lead gen anchor", stages: ["G","S"], btlnk: ["brand_unknown"], krs: [
      { id: "M4.1", text: "Report reaches ≥ 500 downloads in first 30 days", type: "Lagging" },
      { id: "M4.2", text: "Report generates ≥ X press mentions on launch", type: "Lagging" },
      { id: "M4.3", text: "≥ X leads generated from gated download form", type: "Lagging" },
    ]},
    { id: "M5", title: "Equip Sales with content to close deals independently", when: "When Sales regularly asks Marketing for custom assets", stages: ["E","G","S"], btlnk: ["pipeline_low"], krs: [
      { id: "M5.1", text: "Sales team satisfaction on marketing assets ≥ 8/10", type: "Lagging" },
      { id: "M5.2", text: "Sales deck delivered, validated, and team trained — by Q2", type: "Leading" },
      { id: "M5.3", text: "ROI calculator built, integrated, all AEs trained — by Q2", type: "Leading" },
      { id: "M5.4", text: "≥ 3 case studies published, Sales-validated, available in library", type: "Leading" },
    ]},
    { id: "M6", title: "Grow organic website traffic and build SEO authority", when: "When site gets <5K monthly organic visitors", stages: ["E","G","S"], btlnk: ["no_pipeline","brand_unknown"], krs: [
      { id: "M6.1", text: "Organic traffic grows ×X vs. Q1 baseline", type: "Lagging" },
      { id: "M6.2", text: "Page 1 ranking on X target keywords", type: "Lagging" },
      { id: "M6.3", text: "Domain authority increases by X points", type: "Leading" },
    ]},
    { id: "M7", title: "Build brand awareness in a new market or geography", when: "When entering a geography where brand is unknown", stages: ["G","S"], btlnk: ["brand_unknown"], krs: [
      { id: "M7.1", text: "Branded search volume in target market +X%", type: "Lagging" },
      { id: "M7.2", text: "≥ X earned media mentions in target market publications", type: "Lagging" },
    ]},
    { id: "M8", title: "Build a PR and earned media strategy", when: "When brand is invisible outside its customer base", stages: ["G","S"], btlnk: ["brand_unknown"], krs: [
      { id: "M8.1", text: "≥ X earned media mentions in tier-1 industry publications", type: "Lagging" },
      { id: "M8.2", text: "Founder featured in ≥ X speaking slots at industry events", type: "Leading" },
      { id: "M8.3", text: "≥ X% of new opportunities mention brand before first call", type: "Lagging" },
    ]},
    { id: "M9", title: "Reduce cost per MQL and improve marketing ROI", when: "When marketing budget grows without proportional pipeline", stages: ["S"], btlnk: ["not_profitable"], krs: [
      { id: "M9.1", text: "Cost per MQL from paid channels decreases by X%", type: "Lagging" },
      { id: "M9.2", text: "Marketing ROI (pipeline generated / spend) ≥ X×", type: "Lagging" },
    ]},
    { id: "M10", title: "Launch a new product or feature to market (GTM)", when: "When a significant new product/feature needs a commercial launch", stages: ["E","G","S"], btlnk: ["all"], krs: [
      { id: "M10.1", text: "Launch generates ≥ X MQLs in first 30 days", type: "Lagging" },
      { id: "M10.2", text: "Sales team trained and using new messaging in ≥ X% of demos", type: "Leading" },
      { id: "M10.3", text: "≥ X existing customers upgrade within 60 days of launch", type: "Lagging" },
    ]},
    { id: "M11", title: "Build a demand generation function from scratch", when: "No structured pipeline generation exists yet", stages: ["E"], btlnk: ["no_pipeline","pmf"], krs: [
      { id: "M11.1", text: "First inbound MQL generated within 30 days of program launch", type: "Lagging" },
      { id: "M11.2", text: "≥ 3 acquisition channels active and tracked by end of Q1", type: "Leading" },
      { id: "M11.3", text: "MQL attribution model agreed with Sales + live in CRM", type: "Leading" },
    ]},
    { id: "M12", title: "Build a community around the category or brand", when: "When organic word-of-mouth is a growth lever", stages: ["G","S"], btlnk: ["brand_unknown"], krs: [
      { id: "M12.1", text: "Community reaches ≥ X active members by end of year", type: "Lagging" },
      { id: "M12.2", text: "≥ X% of new MQLs cite community as discovery channel", type: "Lagging" },
    ]},
    { id: "M13", title: "Launch an ABM program on priority accounts", when: "When Sales has a well-defined target account list", stages: ["G","S"], btlnk: ["pipeline_low"], krs: [
      { id: "M13.1", text: "≥ X% of priority accounts reached through ABM touchpoints", type: "Leading" },
      { id: "M13.2", text: "ABM-influenced pipeline ≥ €XM", type: "Lagging" },
      { id: "M13.3", text: "Meeting booking rate from ABM accounts ≥ X× baseline", type: "Lagging" },
    ]},
    { id: "M14", title: "Build a customer marketing program", when: "When customer base is large enough for referral leverage", stages: ["G","S"], btlnk: ["no_pipeline"], krs: [
      { id: "M14.1", text: "≥ X customer-authored testimonials/reviews published", type: "Lagging" },
      { id: "M14.2", text: "Customer-sourced pipeline ≥ X% of total", type: "Lagging" },
    ]},
    { id: "M15", title: "Establish thought leadership through founder content", when: "When founding team expertise isn't externally visible", stages: ["E","G"], btlnk: ["brand_unknown","no_pipeline"], krs: [
      { id: "M15.1", text: "Founder LinkedIn followers grow by X%", type: "Lagging" },
      { id: "M15.2", text: "Founder content generates ≥ X MQLs/quarter", type: "Lagging" },
      { id: "M15.3", text: "≥ X inbound speaking invitations per year", type: "Lagging" },
    ]},
    { id: "M16", title: "Reposition the brand and update core messaging", when: "When product has evolved beyond original positioning", stages: ["E","G","S"], btlnk: ["pipeline_low","pmf"], krs: [
      { id: "M16.1", text: "New positioning deployed across all channels by Q2", type: "Leading" },
      { id: "M16.2", text: "Sales team satisfaction with messaging ≥ 8/10", type: "Lagging" },
      { id: "M16.3", text: "Inbound MQL quality improves by X% post-repositioning", type: "Lagging" },
    ]},
    { id: "M17", title: "Build a webinar and virtual event program", when: "When target audience is geographically dispersed", stages: ["E","G","S"], btlnk: ["no_pipeline"], krs: [
      { id: "M17.1", text: "≥ X webinars per year with ≥ X registrants each", type: "Leading" },
      { id: "M17.2", text: "Webinar-to-MQL conversion rate ≥ X%", type: "Lagging" },
      { id: "M17.3", text: "≥ X% of attendees book a demo within 30 days", type: "Lagging" },
    ]},
    { id: "M18", title: "Build a partner marketing program", when: "When distribution through partners is part of GTM", stages: ["G","S"], btlnk: ["not_profitable"], krs: [
      { id: "M18.1", text: "≥ X co-marketing activations per year", type: "Leading" },
      { id: "M18.2", text: "Partner-influenced pipeline ≥ €XM", type: "Lagging" },
    ]},
  ],
  csm: [
    { id: "C1", title: "Maximize revenue from the existing customer base (NRR)", when: "Always relevant — NRR is the primary CSM KR", stages: ["E","G","S"], btlnk: ["all"], krs: [
      { id: "C1.1", text: "Net Revenue Retention (NRR) ≥ 110%", type: "Lagging" },
      { id: "C1.2", text: "Gross churn rate ≤ 5%", type: "Lagging" },
      { id: "C1.3", text: "≥ 30% of customers expand to higher tier / module", type: "Lagging" },
      { id: "C1.4", text: "Average time-to-first-value ≤ 30 days", type: "Leading" },
    ]},
    { id: "C2", title: "Reduce gross churn and stabilize the customer base", when: "When churn is above 7% or accelerating", stages: ["E","G","S"], btlnk: ["churn"], krs: [
      { id: "C2.1", text: "Gross churn rate ≤ X%", type: "Lagging" },
      { id: "C2.2", text: "% of at-risk accounts (health score < threshold) recovered ≥ 70%", type: "Lagging" },
      { id: "C2.3", text: "Time from health score alert to CSM action ≤ 24 hours", type: "Leading" },
    ]},
    { id: "C3", title: "Reduce time-to-first-value and accelerate activation", when: "When new customers take too long to see results", stages: ["E","G","S"], btlnk: ["churn"], krs: [
      { id: "C3.1", text: "Average time-to-first-value ≤ 30 days for new customers", type: "Lagging" },
      { id: "C3.2", text: "% of new customers completing activation event in 30 days ≥ X%", type: "Lagging" },
      { id: "C3.3", text: "Onboarding NPS ≥ X", type: "Leading" },
    ]},
    { id: "C4", title: "Drive product adoption and increase feature utilization", when: "When customers use only a fraction of the product", stages: ["E","G","S"], btlnk: ["churn","not_profitable"], krs: [
      { id: "C4.1", text: "Average feature adoption rate ≥ X% across active accounts", type: "Lagging" },
      { id: "C4.2", text: "% of accounts with ≥ X active users/month ≥ X%", type: "Lagging" },
      { id: "C4.3", text: "% of accounts with internal product champion enabled ≥ X%", type: "Leading" },
    ]},
    { id: "C5", title: "Generate expansion revenue through upsell / cross-sell", when: "When installed base has real upsell potential", stages: ["G","S"], btlnk: ["not_profitable"], krs: [
      { id: "C5.1", text: "Expansion ARR ≥ €X from existing accounts", type: "Lagging" },
      { id: "C5.2", text: "≥ X% of customers expand to higher tier or additional module", type: "Lagging" },
      { id: "C5.3", text: "Expansion pipeline ≥ €X tracked in CRM at all times", type: "Leading" },
    ]},
    { id: "C6", title: "Build a scalable onboarding system without CSM involvement", when: "When CSM capacity is consumed by manual onboarding", stages: ["G","S"], btlnk: ["not_profitable"], krs: [
      { id: "C6.1", text: "% of new customers completing onboarding without a CSM-led session ≥ X%", type: "Lagging" },
      { id: "C6.2", text: "CSM time spent on onboarding per customer reduces by X%", type: "Lagging" },
    ]},
    { id: "C7", title: "Turn the customer base into an active acquisition channel", when: "When referrals are occasional and unstructured", stages: ["G","S"], btlnk: ["no_pipeline"], krs: [
      { id: "C7.1", text: "≥ 5 qualified opportunities sourced from customer referrals", type: "Lagging" },
      { id: "C7.2", text: "NPS ≥ 40 with ≥ 30 responses (statistical validity gate)", type: "Lagging" },
      { id: "C7.3", text: "% of NPS promoters who have referred ≥ 1 prospect ≥ X%", type: "Lagging" },
    ]},
    { id: "C8", title: "Build a customer health monitoring system", when: "When CSM teams are reactive — problems only found when customers call", stages: ["E","G"], btlnk: ["churn"], krs: [
      { id: "C8.1", text: "Health score configured and live for 100% of accounts", type: "Leading" },
      { id: "C8.2", text: "% of at-risk accounts with an active intervention plan ≥ X%", type: "Leading" },
      { id: "C8.3", text: "Time between health score drop and CSM action ≤ 24 hours", type: "Leading" },
    ]},
    { id: "C9", title: "Improve customer satisfaction and Net Promoter Score", when: "When NPS is unknown, declining, or below 30", stages: ["E","G","S"], btlnk: ["churn"], krs: [
      { id: "C9.1", text: "NPS ≥ 40 with ≥ 30 responses per quarter", type: "Lagging" },
      { id: "C9.2", text: "% of detractors (score ≤ 6) with follow-up call in 72h = 100%", type: "Leading" },
      { id: "C9.3", text: "NPS trend improves quarter-over-quarter", type: "Lagging" },
    ]},
    { id: "C10", title: "Build a Quarterly Business Review (QBR) framework", when: "When customer conversations are reactive and transactional", stages: ["E","G","S"], btlnk: ["churn"], krs: [
      { id: "C10.1", text: "% of accounts >€Xk ARR receiving QBR on schedule ≥ X%", type: "Leading" },
      { id: "C10.2", text: "QBR satisfaction score from customers ≥ X/10", type: "Lagging" },
      { id: "C10.3", text: "% of QBRs resulting in an expansion conversation ≥ X%", type: "Lagging" },
    ]},
    { id: "C11", title: "Produce customer case studies and advocacy content", when: "When Sales lacks social proof for key verticals", stages: ["E","G","S"], btlnk: ["no_pipeline","pipeline_low"], krs: [
      { id: "C11.1", text: "≥ 3 case studies published, customer-approved, in Sales library", type: "Lagging" },
      { id: "C11.2", text: "% of case studies with ≥ 2 specific quantified metrics = 100%", type: "Lagging" },
      { id: "C11.3", text: "≥ 3 case studies used in active sales cycles per quarter", type: "Lagging" },
    ]},
    { id: "C12", title: "Build a renewal forecasting system", when: "When the finance team cannot predict renewal revenue", stages: ["G","S"], btlnk: ["churn","not_profitable"], krs: [
      { id: "C12.1", text: "% of renewals initiated ≥ 90 days before contract end ≥ X%", type: "Leading" },
      { id: "C12.2", text: "Renewal forecast vs. actual variance ≤ X%", type: "Lagging" },
    ]},
    { id: "C13", title: "Build a customer education and certification program", when: "When low adoption is linked to knowledge gaps", stages: ["G","S"], btlnk: ["churn"], krs: [
      { id: "C13.1", text: "≥ X% of active users complete at least 1 training module", type: "Lagging" },
      { id: "C13.2", text: "% of accounts with a certified internal champion ≥ X%", type: "Leading" },
      { id: "C13.3", text: "Support ticket volume decreases by X% in accounts with certified users", type: "Lagging" },
    ]},
    { id: "C14", title: "Scale CSM capacity without proportional headcount growth", when: "When accounts-per-CSM ratio is below benchmark", stages: ["S"], btlnk: ["not_profitable"], krs: [
      { id: "C14.1", text: "Accounts per CSM increases from X to Y without churn increase", type: "Lagging" },
      { id: "C14.2", text: "% of low-tier accounts managed through automated playbooks ≥ X%", type: "Leading" },
    ]},
    { id: "C15", title: "Build a Voice of Customer program feeding Product", when: "When Product decisions are not informed by customer feedback", stages: ["E","G","S"], btlnk: ["churn"], krs: [
      { id: "C15.1", text: "≥ X customer feedback sessions conducted per quarter", type: "Leading" },
      { id: "C15.2", text: "≥ X% of Product roadmap items traceable to a documented customer insight", type: "Lagging" },
    ]},
    { id: "C16", title: "Build a structured customer reference program for Sales", when: "When Sales uses the same 2–3 references for every deal", stages: ["G","S"], btlnk: ["pipeline_low"], krs: [
      { id: "C16.1", text: "≥ X reference-ready customers in the program at all times", type: "Leading" },
      { id: "C16.2", text: "Reference call request fulfilled within 48h ≥ X% of the time", type: "Lagging" },
      { id: "C16.3", text: "≥ X% of enterprise deals include a reference call", type: "Lagging" },
    ]},
  ]
}
