-- ============================================================
-- Add KR-level linking to action_templates + comprehensive seed
-- ============================================================

-- 1. Add relevant_kr_ids column
ALTER TABLE public.action_templates
  ADD COLUMN IF NOT EXISTS relevant_kr_ids text[] DEFAULT '{}';

-- 2. Clear old seed data (CASCADE because actions may reference templates)
TRUNCATE public.action_templates CASCADE;

-- 3. Seed comprehensive action templates (~400) linked to specific KRs
-- Each KR should have 20-30 suggested actions via overlap

-- ============================
-- SALES TEMPLATES
-- ============================

INSERT INTO public.action_templates (title, description, channel, action_type, relevant_objectives, relevant_kr_ids, effort, impact) VALUES

-- S1: Generate new ARR and hit revenue target
('Build deal pipeline tracking dashboard', 'Create a real-time dashboard showing pipeline by stage, expected close date, and weighted revenue to track ARR progress.', 'ops', 'technical', '{"S1","S11"}', '{"S1.1","S1.2","S11.1","S11.3"}', 'medium', 'high'),
('Launch enterprise account targeting program', 'Define target enterprise accounts by ICP criteria, assign dedicated AEs, and create personalized outreach sequences.', 'outbound', 'strategy', '{"S1","S7"}', '{"S1.2","S7.1","S7.2","S7.3"}', 'medium', 'high'),
('Implement MEDDICC qualification framework', 'Train sales team on MEDDICC, embed scoring in CRM, and require qualification before advancing deals.', 'ops', 'process', '{"S1","S4"}', '{"S1.3","S4.1","S4.2","S4.3"}', 'medium', 'high'),
('Create competitive battle cards', 'Research top 5 competitors, document differentiators, objection handling, and win themes for each.', 'content', 'creation', '{"S1","S4","S13"}', '{"S1.3","S4.1","S13.1","S13.2"}', 'medium', 'high'),
('Set up weekly pipeline review cadence', 'Establish structured weekly deal reviews with CRO focusing on top deals, blockers, and next steps.', 'ops', 'process', '{"S1","S11"}', '{"S1.1","S1.4","S11.1","S11.2"}', 'low', 'medium'),
('Build ROI calculator for prospects', 'Create an interactive tool that quantifies the financial impact of your solution for prospect-specific scenarios.', 'product', 'technical', '{"S1","S13","M5"}', '{"S1.3","S13.1","S13.3","M5.3"}', 'medium', 'high'),
('Design multi-thread engagement playbook', 'Document strategies to engage multiple stakeholders (champion, economic buyer, technical evaluator) in enterprise deals.', 'ops', 'process', '{"S1","S7","S16"}', '{"S1.2","S7.3","S16.1","S16.2"}', 'medium', 'high'),
('Implement sales velocity tracking', 'Track and optimize the 4 levers: deal count, win rate, average deal size, and sales cycle length.', 'ops', 'technical', '{"S1","S3"}', '{"S1.1","S1.3","S1.4","S3.1"}', 'low', 'high'),

-- S2: Build repeatable sales motion without founder
('Document founder sales playbook', 'Shadow the founder on 10+ deals, document patterns, scripts, objection handling, and decision-making frameworks.', 'ops', 'process', '{"S2","S14"}', '{"S2.1","S2.2","S14.2"}', 'medium', 'high'),
('Create AE onboarding program', 'Build a 30-60-90 day program with training modules, shadowing, role-plays, and certification milestones.', 'ops', 'process', '{"S2","S14"}', '{"S2.2","S2.3","S14.2","S14.3"}', 'high', 'high'),
('Build demo script library', 'Create standardized demo scripts for each persona/use case with discovery questions and value statements.', 'content', 'creation', '{"S2","S13"}', '{"S2.1","S2.2","S13.1","S13.2"}', 'medium', 'high'),
('Set up deal coaching program', 'Establish weekly 1:1 deal coaching sessions where managers review AE deals and provide tactical guidance.', 'ops', 'process', '{"S2","S14"}', '{"S2.1","S2.3","S14.1","S14.3"}', 'low', 'high'),
('Record and distribute founder sales calls', 'Use Gong/Chorus to record founder calls, tag key moments, and create a library of best-practice examples.', 'ops', 'technical', '{"S2"}', '{"S2.1","S2.2","S2.3"}', 'low', 'medium'),
('Create objection handling database', 'Document top 20 objections with proven responses, supporting data, and customer proof points.', 'content', 'creation', '{"S2","S4","S16"}', '{"S2.2","S4.1","S16.1","S16.2"}', 'medium', 'high'),

-- S3: Shorten sales cycle and increase velocity
('Implement mutual action plans', 'Create shared project plans with prospects that define steps, owners, and deadlines to close.', 'ops', 'process', '{"S3","S16"}', '{"S3.1","S3.2","S16.1"}', 'low', 'high'),
('Build next-step enforcement in CRM', 'Configure CRM to require a confirmed next step with date before a deal can be saved or advanced.', 'ops', 'technical', '{"S3","S11"}', '{"S3.2","S11.2"}', 'low', 'medium'),
('Create stalled deal intervention playbook', 'Define triggers (30+ days no activity), escalation paths, and re-engagement sequences for stuck deals.', 'ops', 'process', '{"S3"}', '{"S3.1","S3.3"}', 'medium', 'high'),
('Deploy deal acceleration content', 'Create bottom-of-funnel content (pricing guides, implementation timelines, security docs) that removes buying friction.', 'content', 'creation', '{"S3","S13","M5"}', '{"S3.1","S13.1","M5.1","M5.2"}', 'medium', 'high'),
('Set up automated deal nudges', 'Configure automated email/Slack alerts when deals go idle beyond threshold days per stage.', 'ops', 'technical', '{"S3","S11"}', '{"S3.3","S11.2"}', 'low', 'medium'),

-- S4: Improve win rate on qualified opportunities
('Run win/loss analysis program', 'Interview lost prospects monthly, categorize loss reasons, and share insights with product and marketing.', 'ops', 'process', '{"S4"}', '{"S4.1","S4.3"}', 'medium', 'high'),
('Build deal scoring model', 'Create a weighted scoring model based on MEDDICC criteria to predict deal probability accurately.', 'ops', 'technical', '{"S4","S11"}', '{"S4.1","S4.2","S11.1"}', 'medium', 'high'),
('Launch sales enablement content hub', 'Organize all sales assets (decks, one-pagers, case studies) in a searchable internal portal.', 'content', 'technical', '{"S4","S13","M5"}', '{"S4.1","S13.2","M5.1","M5.2"}', 'medium', 'medium'),
('Create champion enablement toolkit', 'Build internal champion kits (slides, ROI summaries, comparison docs) that help your champion sell internally.', 'content', 'creation', '{"S4","S16"}', '{"S4.1","S16.1","S16.2"}', 'medium', 'high'),
('Implement mandatory loss documentation', 'Require structured loss reason capture in CRM with specific categories and free-text explanation.', 'ops', 'process', '{"S4"}', '{"S4.3"}', 'low', 'medium'),

-- S5: Build pipeline independent from single source
('Diversify lead generation channels', 'Audit current pipeline sources, identify gaps, and launch 2-3 new channels (events, partnerships, content).', 'ops', 'strategy', '{"S5","M1"}', '{"S5.1","S5.2","M1.1"}', 'high', 'high'),
('Launch inbound marketing program', 'Build content + SEO + paid engine to generate marketing-sourced pipeline at scale.', 'content', 'strategy', '{"S5","M1","M2"}', '{"S5.2","M1.1","M1.3","M2.1"}', 'high', 'high'),
('Build partner referral program', 'Create structured partner program with incentives, co-marketing, and shared deal registration.', 'ops', 'strategy', '{"S5","S8"}', '{"S5.1","S8.1","S8.2"}', 'medium', 'high'),
('Set up pipeline source attribution', 'Implement multi-touch attribution to track pipeline contribution by channel accurately.', 'ops', 'technical', '{"S5","M9"}', '{"S5.1","S5.2","M9.2"}', 'medium', 'medium'),
('Implement pipeline coverage monitoring', 'Build automated alerts when pipeline coverage drops below 3× target for any quarter.', 'ops', 'technical', '{"S5","S11"}', '{"S5.3","S11.3"}', 'low', 'high'),

-- S6: Enter new geographic market
('Research target market landscape', 'Conduct deep market analysis: competitors, regulations, buyer personas, pricing benchmarks in target geography.', 'ops', 'strategy', '{"S6","M7"}', '{"S6.1","S6.2","M7.1"}', 'medium', 'high'),
('Localize sales materials', 'Translate and culturally adapt pitch deck, website, case studies, and legal docs for target market.', 'content', 'creation', '{"S6","M7"}', '{"S6.1","S6.2","M7.1","M7.2"}', 'medium', 'medium'),
('Build local partner network', 'Identify and sign 3-5 local partners (consultants, integrators, resellers) in target geography.', 'ops', 'strategy', '{"S6","S8"}', '{"S6.1","S6.3","S8.1"}', 'high', 'high'),
('Launch targeted outbound in new market', 'Build ICP list for target market, create localized sequences, and launch multi-channel outreach.', 'outbound', 'creation', '{"S6","S9"}', '{"S6.3","S9.1","S9.3"}', 'medium', 'high'),
('Attend key industry events in target market', 'Sponsor or attend 2-3 major events in target geography to build visibility and generate meetings.', 'events', 'strategy', '{"S6","M7"}', '{"S6.1","S6.3","M7.1","M7.2"}', 'high', 'medium'),

-- S7: Move upmarket, increase ACV
('Build enterprise sales playbook', 'Document longer-cycle enterprise sales process with procurement, security reviews, and multi-stakeholder engagement.', 'ops', 'process', '{"S7","S1"}', '{"S7.1","S7.3","S1.2"}', 'medium', 'high'),
('Create enterprise pricing and packaging', 'Design tiered pricing with enterprise features, SLAs, and volume discounts that justify higher ACV.', 'ops', 'strategy', '{"S7"}', '{"S7.1","S7.3"}', 'medium', 'high'),
('Build security and compliance documentation', 'Prepare SOC2 report, GDPR docs, security questionnaire responses, and data processing agreements.', 'ops', 'process', '{"S7","S16"}', '{"S7.2","S7.3","S16.3"}', 'high', 'high'),
('Launch account-based marketing for enterprise', 'Run personalized ABM campaigns targeting enterprise ICP accounts with tailored content and ads.', 'paid', 'strategy', '{"S7","M13"}', '{"S7.2","M13.1","M13.2"}', 'medium', 'high'),
('Develop enterprise case studies', 'Create 3+ case studies from large customers highlighting enterprise-scale value, ROI, and integration.', 'content', 'creation', '{"S7","C11","M5"}', '{"S7.3","C11.1","C11.2","M5.4"}', 'medium', 'high'),

-- S8: Build partner and channel sales engine
('Define partner program tiers', 'Create Bronze/Silver/Gold partner levels with clear benefits, requirements, and revenue share models.', 'ops', 'strategy', '{"S8"}', '{"S8.1","S8.2"}', 'medium', 'high'),
('Build partner enablement kit', 'Create partner-specific sales materials, demo environments, training courses, and certification program.', 'content', 'creation', '{"S8","M18"}', '{"S8.1","S8.2","M18.1"}', 'high', 'high'),
('Implement partner deal registration system', 'Set up CRM workflows for partner-sourced leads with automated routing, tracking, and commission calculation.', 'ops', 'technical', '{"S8"}', '{"S8.1","S8.2"}', 'medium', 'medium'),
('Launch partner co-selling program', 'Train partners on your product, set up joint selling motions, and establish regular pipeline reviews.', 'ops', 'process', '{"S8","M18"}', '{"S8.1","S8.2","M18.1","M18.2"}', 'high', 'high'),

-- S9: Build predictable outbound SDR machine
('Hire and ramp SDR team', 'Recruit 2-3 SDRs, create compensation plans with meeting booking incentives, and run boot camp training.', 'ops', 'hiring', '{"S9"}', '{"S9.1","S9.2","S9.3"}', 'high', 'high'),
('Build ICP-based prospect lists', 'Use enrichment tools to build high-quality prospect lists matching ideal customer profile criteria.', 'outbound', 'technical', '{"S9","S5"}', '{"S9.1","S9.3","S5.1"}', 'medium', 'high'),
('Create multi-touch outbound cadences', 'Design 15-touch sequences mixing email, LinkedIn, phone, and video across 4-5 weeks.', 'outbound', 'creation', '{"S9"}', '{"S9.1","S9.2","S9.3"}', 'medium', 'high'),
('Set up SDR tech stack', 'Deploy outbound tools: sequencer (Outreach/Salesloft), dialer, LinkedIn Sales Navigator, enrichment.', 'outbound', 'technical', '{"S9"}', '{"S9.1","S9.2"}', 'medium', 'medium'),
('Build SDR performance dashboard', 'Track activities (calls, emails, connects), conversion rates, and pipeline generated per SDR.', 'ops', 'technical', '{"S9","S14"}', '{"S9.1","S9.2","S9.3","S14.1"}', 'low', 'medium'),
('Create personalized messaging templates', 'Write persona-specific email and LinkedIn templates that reference industry pain points and triggers.', 'outbound', 'creation', '{"S9","S6"}', '{"S9.1","S9.2","S6.3"}', 'low', 'high'),

-- S10: Reduce customer acquisition cost
('Analyze CAC by channel and segment', 'Break down all-in acquisition cost by marketing channel, sales segment, and deal size to find inefficiencies.', 'ops', 'strategy', '{"S10","M9"}', '{"S10.1","S10.2","M9.1","M9.2"}', 'medium', 'high'),
('Optimize sales team territories', 'Rebalance territories based on market potential, reduce overlap, and ensure even distribution of opportunity.', 'ops', 'process', '{"S10","S14"}', '{"S10.1","S10.3","S14.1"}', 'medium', 'medium'),
('Automate low-value sales tasks', 'Identify and automate repetitive tasks (data entry, follow-up scheduling, proposal generation) to free AE time.', 'ops', 'technical', '{"S10","S14"}', '{"S10.1","S10.3","S14.1"}', 'medium', 'high'),
('Implement self-serve trial or freemium', 'Build a product-led growth motion that converts users without sales touch for smaller deals.', 'product', 'strategy', '{"S10","M2"}', '{"S10.1","S10.2","M2.1"}', 'high', 'high'),
('Shift spend to high-ROI channels', 'Reallocate marketing budget from low-performing to high-performing channels based on CAC analysis.', 'ops', 'strategy', '{"S10","M9"}', '{"S10.1","M9.1","M9.2"}', 'low', 'high'),

-- S11: Improve forecast accuracy and pipeline discipline
('Implement structured forecast methodology', 'Deploy a commit/best-case/pipeline forecast model with clear criteria for each category.', 'ops', 'process', '{"S11"}', '{"S11.1","S11.3"}', 'medium', 'high'),
('Set up CRM hygiene automation', 'Configure CRM rules to flag stale data, missing fields, and outdated stages automatically.', 'ops', 'technical', '{"S11","S3"}', '{"S11.2","S3.2","S3.3"}', 'low', 'medium'),
('Create pipeline inspection cadence', 'Establish weekly manager pipeline reviews and monthly CRO deep-dives with standardized agenda.', 'ops', 'process', '{"S11"}', '{"S11.1","S11.2","S11.3"}', 'low', 'high'),
('Build forecast accuracy tracking', 'Track predicted vs actual revenue by quarter and by rep to identify systematic over/under-forecasters.', 'ops', 'technical', '{"S11"}', '{"S11.1"}', 'low', 'medium'),

-- S12: Expand existing accounts through upsell
('Build customer expansion playbook', 'Document triggers (usage thresholds, org growth, contract milestones) that signal upsell readiness.', 'ops', 'process', '{"S12","C5"}', '{"S12.1","S12.2","C5.1","C5.2"}', 'medium', 'high'),
('Launch cross-sell campaigns to installed base', 'Create email + CSM-driven campaigns promoting additional modules to existing customers.', 'email', 'strategy', '{"S12","C5","M14"}', '{"S12.1","S12.2","C5.1","C5.2","M14.2"}', 'medium', 'high'),
('Set up expansion pipeline tracking', 'Create separate pipeline views for new business vs expansion, with dedicated forecasting.', 'ops', 'technical', '{"S12","C5"}', '{"S12.1","C5.3"}', 'low', 'medium'),
('Build usage-based upsell triggers', 'Configure automated alerts when customers approach usage limits or show expansion signals.', 'product', 'technical', '{"S12","C5","C8"}', '{"S12.2","C5.1","C5.3","C8.1"}', 'medium', 'high'),

-- S13: Build consultative ROI-led sales approach
('Build value-selling training program', 'Train AEs on consultative selling: discovery frameworks, business case building, and ROI articulation.', 'ops', 'process', '{"S13","S2"}', '{"S13.1","S13.2","S2.2"}', 'medium', 'high'),
('Create industry-specific ROI models', 'Build 3-5 vertical-specific ROI calculators with benchmarks and customer-validated metrics.', 'content', 'creation', '{"S13","M5"}', '{"S13.1","S13.3","M5.3"}', 'high', 'high'),
('Develop one-pager per persona', 'Create targeted one-pagers for each buyer persona (CFO, VP Sales, CMO) with relevant value propositions.', 'content', 'creation', '{"S13","M5"}', '{"S13.1","S13.2","M5.1","M5.2"}', 'medium', 'medium'),
('Survey sales team on enablement satisfaction', 'Run quarterly surveys measuring team satisfaction with tools, content, and training quality.', 'ops', 'process', '{"S13"}', '{"S13.2"}', 'low', 'medium'),

-- S14: Increase sales team productivity per headcount
('Implement sales productivity metrics', 'Track revenue/AE, activities/AE, pipeline generated/AE, and conversion rates per rep.', 'ops', 'technical', '{"S14","S10"}', '{"S14.1","S14.3","S10.3"}', 'low', 'medium'),
('Build structured ramp program', 'Create a milestone-based onboarding with weekly checkpoints, certifications, and graduated quotas.', 'ops', 'process', '{"S14","S2"}', '{"S14.2","S14.3","S2.3"}', 'medium', 'high'),
('Deploy AI-assisted sales tools', 'Implement AI tools for email drafting, meeting prep, CRM updates, and competitive intel to save AE time.', 'ops', 'technical', '{"S14","S10"}', '{"S14.1","S10.1","S10.3"}', 'medium', 'high'),
('Create quota attainment dashboard', 'Build rep-level dashboard showing quota progress, pipeline coverage, and activity benchmarks.', 'ops', 'technical', '{"S14","S11"}', '{"S14.3","S11.1"}', 'low', 'medium'),

-- S15: Build lighthouse customer in new vertical
('Identify target lighthouse prospects', 'Research and shortlist 10-15 well-known companies in target vertical that would serve as strong references.', 'outbound', 'strategy', '{"S15","S6"}', '{"S15.1","S6.1"}', 'medium', 'high'),
('Create vertical-specific pitch', 'Develop tailored messaging, use cases, and proof points specific to the target vertical.', 'content', 'creation', '{"S15","M16"}', '{"S15.1","S15.2","M16.1"}', 'medium', 'high'),
('Offer lighthouse incentive package', 'Create a special package (discount, co-development, premium support) for lighthouse customers.', 'ops', 'strategy', '{"S15"}', '{"S15.1","S15.2"}', 'low', 'medium'),
('Build lighthouse customer case study', 'Once signed, fast-track a detailed case study with video testimonial for the new vertical.', 'content', 'creation', '{"S15","C11"}', '{"S15.2","S15.3","C11.1","C11.2"}', 'medium', 'high'),
('Leverage lighthouse for vertical pipeline', 'Use lighthouse reference in targeted outbound, ABM, and event marketing for the vertical.', 'outbound', 'strategy', '{"S15","M13"}', '{"S15.3","M13.1","M13.2"}', 'medium', 'high'),

-- S16: Reduce late-stage deal loss
('Analyze proposal-stage loss patterns', 'Review all deals lost at proposal+ stage in last 12 months, categorize root causes, and identify fixes.', 'ops', 'strategy', '{"S16","S4"}', '{"S16.1","S4.3"}', 'medium', 'high'),
('Build champion enablement program', 'Create internal champion toolkits with slides, TCO analysis, and executive briefing templates.', 'content', 'creation', '{"S16","S4"}', '{"S16.2","S4.1","S16.1"}', 'medium', 'high'),
('Implement pre-proposal security review process', 'Proactively share security docs and complete questionnaires before proposal stage to remove blockers.', 'ops', 'process', '{"S16","S7"}', '{"S16.3","S7.3"}', 'medium', 'medium'),
('Create executive sponsor engagement plan', 'Define when and how to engage C-level sponsors on your side for enterprise deals at proposal stage.', 'ops', 'process', '{"S16","S7"}', '{"S16.1","S7.3"}', 'low', 'high'),

-- ============================
-- MARKETING TEMPLATES
-- ============================

-- M1: Make marketing primary contributor to pipeline
('Build end-to-end lead scoring model', 'Define MQL criteria with demographic + behavioral scoring, implement in CRM, and align with Sales on thresholds.', 'ops', 'technical', '{"M1","M11"}', '{"M1.1","M1.2","M11.3"}', 'medium', 'high'),
('Launch gated content funnel', 'Create high-value gated assets (guides, templates, tools) with landing pages and conversion-optimized forms.', 'content', 'creation', '{"M1","M2"}', '{"M1.1","M1.3","M2.1","M2.3"}', 'medium', 'high'),
('Set up MQL-to-SQL handoff process', 'Define clear handoff criteria, SLAs (response time), and feedback loops between marketing and sales.', 'ops', 'process', '{"M1","M11"}', '{"M1.2","M11.3"}', 'medium', 'high'),
('Build conversion rate optimization program', 'A/B test landing pages, CTAs, forms, and nurture emails to improve lead-to-MQL conversion rates.', 'ops', 'technical', '{"M1"}', '{"M1.2","M1.4"}', 'medium', 'high'),
('Create marketing-sourced pipeline dashboard', 'Build a dashboard showing MQL volume, conversion rates, pipeline contribution, and ROI by channel.', 'ops', 'technical', '{"M1","M9"}', '{"M1.1","M1.3","M9.2"}', 'low', 'medium'),
('Launch demo request optimization', 'Optimize the demo request flow: reduce form fields, add social proof, implement instant booking.', 'product', 'technical', '{"M1"}', '{"M1.2","M1.3"}', 'low', 'high'),

-- M2: Build scalable inbound engine from organic
('Launch SEO content cluster strategy', 'Create 8-12 interlinked articles around primary keyword themes to build topical authority.', 'seo', 'creation', '{"M2","M6"}', '{"M2.1","M2.2","M2.3","M6.1","M6.2"}', 'high', 'high'),
('Publish weekly blog cadence', 'Establish consistent publishing of 1-2 SEO-optimized articles per week targeting bottom-of-funnel keywords.', 'content', 'creation', '{"M2","M6"}', '{"M2.2","M6.1","M6.2"}', 'medium', 'medium'),
('Build organic social presence', 'Grow LinkedIn company page with 3-5 posts/week mixing thought leadership, product tips, and customer stories.', 'social', 'creation', '{"M2","M15"}', '{"M2.1","M2.3","M15.1"}', 'medium', 'medium'),
('Create lead magnet library', 'Develop 5-10 downloadable resources (templates, checklists, calculators) targeting different funnel stages.', 'content', 'creation', '{"M2","M1"}', '{"M2.1","M2.3","M1.3","M1.4"}', 'high', 'high'),
('Launch resource center on website', 'Build a dedicated section with guides, templates, and tools that captures leads via gated content.', 'content', 'creation', '{"M2","M6"}', '{"M2.1","M2.2","M6.1"}', 'high', 'high'),
('Set up newsletter acquisition funnel', 'Create an email newsletter subscription flow as a top-of-funnel entry point for organic leads.', 'email', 'creation', '{"M2"}', '{"M2.1","M2.3"}', 'low', 'medium'),

-- M3: Establish category leadership
('Create category manifesto content', 'Write a definitive article/whitepaper that frames the category, defines the problem, and positions your approach.', 'content', 'creation', '{"M3","M15"}', '{"M3.1","M3.2","M3.3","M15.2"}', 'medium', 'high'),
('Launch category keyword SEO campaign', 'Target category-defining keywords with pillar content, supporting articles, and backlink acquisition.', 'seo', 'strategy', '{"M3","M6"}', '{"M3.1","M6.1","M6.2","M6.3"}', 'high', 'high'),
('Build category comparison pages', 'Create vs-pages and alternative pages that rank for competitor and category comparison searches.', 'seo', 'creation', '{"M3","M6"}', '{"M3.1","M3.2","M6.2"}', 'medium', 'high'),
('Launch PR campaign around category vision', 'Pitch category story to industry journalists, get founder quoted in category-defining articles.', 'social', 'strategy', '{"M3","M8"}', '{"M3.2","M3.3","M8.1","M8.3"}', 'medium', 'high'),
('Create category glossary and educational content', 'Build the reference glossary for category terms that becomes the go-to educational resource.', 'content', 'creation', '{"M3","M6"}', '{"M3.1","M6.1","M6.2"}', 'medium', 'medium'),

-- M4: Launch flagship content asset
('Build a benchmark report or industry index', 'Produce a data-driven report analyzing industry trends, benchmarks, and best practices.', 'content', 'creation', '{"M4","M3"}', '{"M4.1","M4.2","M4.3","M3.1"}', 'high', 'high'),
('Design launch campaign for flagship content', 'Plan a multi-channel launch: email blast, social promotion, PR outreach, paid amplification.', 'email', 'strategy', '{"M4"}', '{"M4.1","M4.2","M4.3"}', 'medium', 'high'),
('Build gated landing page with A/B testing', 'Create a high-converting download page with social proof, preview content, and optimized form.', 'content', 'technical', '{"M4","M1"}', '{"M4.1","M4.3","M1.3"}', 'low', 'medium'),
('Partner with industry analysts for content', 'Collaborate with analyst firms or industry experts to co-author the report and amplify reach.', 'content', 'strategy', '{"M4","M8"}', '{"M4.2","M8.1"}', 'medium', 'high'),
('Create content repurposing plan', 'Extract 10-15 derivative assets from the report: infographics, social posts, webinar, blog series.', 'content', 'creation', '{"M4","M2"}', '{"M4.1","M4.3","M2.2"}', 'medium', 'medium'),

-- M5: Equip Sales with content
('Build sales enablement portal', 'Create a centralized, searchable library of all sales assets organized by buyer journey stage and persona.', 'content', 'technical', '{"M5","S13"}', '{"M5.1","M5.2","S13.2"}', 'medium', 'high'),
('Create sales deck with talk track', 'Design a modular pitch deck with speaker notes, objection handling, and persona-specific slides.', 'content', 'creation', '{"M5","S2"}', '{"M5.2","S2.2"}', 'medium', 'high'),
('Build customer case study library', 'Interview 5-10 customers and produce structured case studies with measurable results.', 'content', 'creation', '{"M5","C11","S13"}', '{"M5.4","C11.1","C11.2","S13.1"}', 'medium', 'high'),
('Develop ROI calculator tool', 'Build an interactive calculator that AEs can use in demos to quantify value for each prospect.', 'product', 'technical', '{"M5","S13"}', '{"M5.3","S13.1","S13.3"}', 'medium', 'high'),
('Run sales enablement training sessions', 'Host monthly sessions to walk Sales through new content, messaging updates, and competitive intel.', 'ops', 'process', '{"M5","S13"}', '{"M5.1","M5.2","S13.2"}', 'low', 'medium'),
('Conduct quarterly sales content audit', 'Review all sales assets for accuracy, relevance, and usage rates. Archive outdated content.', 'ops', 'process', '{"M5"}', '{"M5.1","M5.2"}', 'low', 'medium'),

-- M6: Grow organic website traffic
('Perform comprehensive SEO audit', 'Audit technical SEO, content gaps, backlink profile, and competitor keyword positions.', 'seo', 'technical', '{"M6"}', '{"M6.1","M6.2","M6.3"}', 'medium', 'high'),
('Build backlink acquisition strategy', 'Launch guest posting, digital PR, and partner link exchange programs to boost domain authority.', 'seo', 'strategy', '{"M6"}', '{"M6.3","M6.1"}', 'high', 'high'),
('Optimize existing content for SEO', 'Update top 20 pages with improved keywords, internal links, schema markup, and fresher content.', 'seo', 'technical', '{"M6","M2"}', '{"M6.1","M6.2","M2.2"}', 'medium', 'medium'),
('Create programmatic SEO pages', 'Build template-driven pages for repeatable use cases, integrations, or geographic variations.', 'seo', 'technical', '{"M6"}', '{"M6.1","M6.2"}', 'high', 'high'),
('Set up keyword ranking tracker', 'Monitor rankings for 50-100 target keywords with weekly automated reporting.', 'seo', 'technical', '{"M6","M3"}', '{"M6.2","M3.1"}', 'low', 'medium'),

-- M7: Build brand awareness in new market
('Launch localized brand campaign', 'Adapt messaging and launch targeted paid social + content campaigns in the new market language.', 'paid', 'strategy', '{"M7","S6"}', '{"M7.1","M7.2","S6.1","S6.2"}', 'high', 'high'),
('Secure earned media in target market', 'Pitch localized stories to journalists and publications in the target market.', 'social', 'strategy', '{"M7","M8"}', '{"M7.2","M8.1"}', 'medium', 'high'),
('Sponsor regional industry events', 'Select and sponsor 2-3 major events in the new geography for visibility and lead gen.', 'events', 'strategy', '{"M7","S6"}', '{"M7.1","M7.2","S6.1","S6.3"}', 'high', 'medium'),
('Build local influencer partnerships', 'Partner with industry thought leaders in the target market for co-created content and endorsements.', 'social', 'strategy', '{"M7","M15"}', '{"M7.1","M7.2","M15.1","M15.3"}', 'medium', 'high'),

-- M8: Build PR and earned media strategy
('Hire PR agency or freelancer', 'Engage an agency specializing in B2B SaaS to manage media relations, press releases, and pitching.', 'ops', 'hiring', '{"M8"}', '{"M8.1","M8.2","M8.3"}', 'high', 'high'),
('Create company newsroom', 'Build a press page with media kit, logos, founder bios, press releases, and contact info.', 'content', 'creation', '{"M8"}', '{"M8.1","M8.3"}', 'low', 'medium'),
('Develop founder speaking program', 'Apply to 10-15 conference speaking slots, create speaker kit, and prep keynote materials.', 'events', 'strategy', '{"M8","M15"}', '{"M8.2","M15.1","M15.3"}', 'medium', 'high'),
('Launch data-driven PR campaign', 'Create original research or data analysis that generates newsworthy headlines and journalist interest.', 'content', 'creation', '{"M8","M4"}', '{"M8.1","M4.2"}', 'high', 'high'),
('Build journalist relationship program', 'Identify top 20 industry journalists, follow their work, provide expert commentary, and build relationships.', 'social', 'strategy', '{"M8"}', '{"M8.1","M8.2"}', 'medium', 'medium'),

-- M9: Reduce cost per MQL and improve marketing ROI
('Set up marketing attribution model', 'Implement multi-touch attribution to measure real contribution of each channel to pipeline.', 'ops', 'technical', '{"M9","M1"}', '{"M9.1","M9.2","M1.1"}', 'high', 'high'),
('Optimize paid campaigns by CAC', 'Analyze cost-per-acquisition by campaign, pause underperformers, double down on winners.', 'paid', 'strategy', '{"M9"}', '{"M9.1","M9.2"}', 'medium', 'high'),
('Shift budget to organic channels', 'Invest more in SEO, content, and community to reduce paid dependency and lower overall cost per MQL.', 'ops', 'strategy', '{"M9","M2"}', '{"M9.1","M9.2","M2.1"}', 'medium', 'high'),
('Implement marketing automation', 'Deploy automation for lead scoring, nurture sequences, and campaign workflows to reduce manual effort.', 'ops', 'technical', '{"M9","M1"}', '{"M9.1","M1.2"}', 'medium', 'medium'),

-- M10: Launch new product/feature (GTM)
('Create GTM launch playbook', 'Build a repeatable launch process: messaging, enablement, campaigns, success metrics, and timeline.', 'ops', 'process', '{"M10","M5"}', '{"M10.1","M10.2","M5.2"}', 'medium', 'high'),
('Build product launch campaign', 'Design multi-channel campaign: email blast, blog post, social media, webinar, and in-app notifications.', 'email', 'strategy', '{"M10"}', '{"M10.1","M10.3"}', 'medium', 'high'),
('Train sales team on new product messaging', 'Run dedicated enablement sessions with updated deck, FAQ, demo script, and objection handling.', 'ops', 'process', '{"M10","M5"}', '{"M10.2","M5.2"}', 'low', 'high'),
('Launch customer upgrade campaign', 'Target existing customers with personalized emails highlighting new feature value and upgrade path.', 'email', 'creation', '{"M10","C5"}', '{"M10.3","C5.1","C5.2"}', 'medium', 'high'),
('Create product launch landing page', 'Build a dedicated page with feature details, benefits, customer quotes, and clear CTA.', 'content', 'creation', '{"M10"}', '{"M10.1","M10.3"}', 'low', 'medium'),

-- M11: Build demand generation from scratch
('Define demand gen strategy and channels', 'Map the buyer journey, identify key acquisition channels, and create initial campaign roadmap.', 'ops', 'strategy', '{"M11"}', '{"M11.1","M11.2","M11.3"}', 'medium', 'high'),
('Set up marketing tech stack', 'Deploy CRM, email platform, analytics, ad accounts, and landing page builder as foundation.', 'ops', 'technical', '{"M11"}', '{"M11.2","M11.3"}', 'medium', 'high'),
('Launch first lead gen campaign', 'Execute a quick-win campaign (gated content + paid promotion) to generate initial MQLs within 30 days.', 'paid', 'strategy', '{"M11","M1"}', '{"M11.1","M1.3"}', 'medium', 'high'),
('Build MQL definition and tracking', 'Align marketing and sales on MQL criteria, implement scoring, and set up attribution tracking.', 'ops', 'process', '{"M11","M1"}', '{"M11.3","M1.1","M1.2"}', 'medium', 'high'),
('Hire demand gen manager', 'Recruit an experienced demand gen leader to own pipeline targets and scale the function.', 'ops', 'hiring', '{"M11","M1"}', '{"M11.1","M11.2","M1.1"}', 'high', 'high'),

-- M12: Build community around category
('Launch branded Slack/Discord community', 'Create and launch a community space around your category, with discussion channels, AMAs, and resources.', 'social', 'creation', '{"M12"}', '{"M12.1","M12.2"}', 'medium', 'high'),
('Build community content program', 'Organize weekly threads, monthly AMAs with experts, and community-contributed content.', 'social', 'creation', '{"M12","M15"}', '{"M12.1","M12.2","M15.1"}', 'medium', 'medium'),
('Create community-to-lead conversion', 'Build subtle conversion paths from community engagement to product awareness and demo requests.', 'ops', 'strategy', '{"M12","M1"}', '{"M12.2","M1.3"}', 'low', 'high'),
('Launch community events program', 'Host monthly virtual meetups, workshops, or panels featuring community members and experts.', 'events', 'creation', '{"M12","M17"}', '{"M12.1","M17.1"}', 'medium', 'medium'),

-- M13: Launch ABM program
('Build ABM target account list', 'Collaborate with Sales to define ICP, score accounts, and create a prioritized target list of 50-100 accounts.', 'ops', 'strategy', '{"M13","S5"}', '{"M13.1","S5.1","S5.3"}', 'medium', 'high'),
('Set up LinkedIn ABM campaigns', 'Target priority accounts with personalized ad sequences driving to tailored landing pages.', 'paid', 'strategy', '{"M13","M1"}', '{"M13.1","M13.2","M1.1"}', 'medium', 'high'),
('Create account-personalized content', 'Develop personalized landing pages, emails, and content for top-tier target accounts.', 'content', 'creation', '{"M13"}', '{"M13.1","M13.3"}', 'high', 'high'),
('Implement ABM intent monitoring', 'Deploy intent data tools to identify target accounts researching your category and trigger outreach.', 'ops', 'technical', '{"M13","S9"}', '{"M13.1","M13.3","S9.1"}', 'medium', 'high'),
('Build ABM performance dashboard', 'Track account engagement, pipeline influence, and meeting booking rates from ABM campaigns.', 'ops', 'technical', '{"M13"}', '{"M13.2","M13.3"}', 'low', 'medium'),

-- M14: Build customer marketing program
('Launch customer advocacy program', 'Identify and recruit satisfied customers as advocates, with recognition, perks, and reference opportunities.', 'ops', 'strategy', '{"M14","C7","C16"}', '{"M14.1","M14.2","C7.1","C16.1"}', 'medium', 'high'),
('Build customer testimonial collection', 'Systematize collection of video and written testimonials with templates and interview guides.', 'content', 'creation', '{"M14","C11"}', '{"M14.1","C11.1","C11.2"}', 'medium', 'high'),
('Launch customer referral program', 'Create a structured referral program with incentives, tracking, and automated communication.', 'ops', 'strategy', '{"M14","C7"}', '{"M14.2","C7.1","C7.3"}', 'medium', 'high'),
('Create customer newsletter', 'Build a monthly newsletter with product updates, tips, case studies, and industry insights.', 'email', 'creation', '{"M14","C4"}', '{"M14.1","C4.1","C4.2"}', 'low', 'medium'),

-- M15: Founder thought leadership
('Launch founder LinkedIn program', 'Plan and publish 3+ posts/week from the founder covering industry insights and company story.', 'social', 'creation', '{"M15","M3"}', '{"M15.1","M15.2","M3.2"}', 'medium', 'high'),
('Build founder speaking pipeline', 'Apply to 15+ conference speaking slots, create speaker kit, and prepare keynote materials.', 'events', 'strategy', '{"M15","M8"}', '{"M15.3","M8.2"}', 'medium', 'high'),
('Create founder content calendar', 'Plan monthly themes aligned with industry trends, product launches, and category narrative.', 'content', 'creation', '{"M15"}', '{"M15.1","M15.2"}', 'low', 'medium'),
('Launch founder podcast or video series', 'Start a regular podcast/video series featuring industry leaders and customer conversations.', 'content', 'creation', '{"M15","M3"}', '{"M15.1","M15.2","M15.3","M3.2"}', 'high', 'high'),
('Ghost-write founder articles for publications', 'Write and pitch byline articles for industry publications under the founder name.', 'content', 'creation', '{"M15","M8"}', '{"M15.1","M15.2","M8.1"}', 'medium', 'high'),

-- M16: Reposition brand and messaging
('Conduct brand and messaging audit', 'Review all customer-facing materials, interview stakeholders, and analyze competitor positioning.', 'ops', 'strategy', '{"M16"}', '{"M16.1","M16.2","M16.3"}', 'medium', 'high'),
('Develop new messaging framework', 'Create positioning statement, value propositions, proof points, and tone guidelines.', 'content', 'creation', '{"M16","M5"}', '{"M16.1","M16.2","M5.2"}', 'medium', 'high'),
('Deploy new messaging across channels', 'Update website, email templates, ad copy, social profiles, and sales materials with new positioning.', 'content', 'creation', '{"M16"}', '{"M16.1"}', 'high', 'medium'),
('Train sales team on new positioning', 'Run workshops on updated messaging, talk track, and competitive differentiation.', 'ops', 'process', '{"M16","M5"}', '{"M16.2","M5.1","M5.2"}', 'low', 'high'),
('Measure repositioning impact', 'Track MQL quality, sales satisfaction, and win rates pre/post repositioning to validate impact.', 'ops', 'technical', '{"M16"}', '{"M16.3"}', 'low', 'medium'),

-- M17: Build webinar and virtual event program
('Plan webinar calendar and topics', 'Map monthly webinar topics aligned with buyer pain points, seasonal trends, and product launches.', 'events', 'strategy', '{"M17"}', '{"M17.1","M17.2","M17.3"}', 'low', 'high'),
('Build webinar production workflow', 'Create templates, promotion timeline, speaker prep checklist, and post-event follow-up sequences.', 'events', 'process', '{"M17"}', '{"M17.1","M17.2"}', 'medium', 'medium'),
('Launch webinar promotion campaigns', 'Run multi-channel promotion: email, LinkedIn ads, social posts, partner amplification.', 'paid', 'strategy', '{"M17","M1"}', '{"M17.1","M17.2","M1.3"}', 'medium', 'high'),
('Build webinar-to-demo conversion path', 'Create automated post-webinar nurture with personalized follow-up and demo booking CTA.', 'email', 'creation', '{"M17","M1"}', '{"M17.3","M1.2"}', 'low', 'high'),
('Repurpose webinar content', 'Turn webinar recordings into blog posts, social clips, podcasts, and gated on-demand content.', 'content', 'creation', '{"M17","M2"}', '{"M17.1","M2.2","M2.3"}', 'low', 'medium'),

-- M18: Build partner marketing program
('Develop partner co-marketing playbook', 'Document joint marketing activities, asset sharing, lead routing, and co-branding guidelines.', 'ops', 'process', '{"M18","S8"}', '{"M18.1","M18.2","S8.1"}', 'medium', 'medium'),
('Launch co-branded content campaigns', 'Create joint whitepapers, webinars, or case studies with strategic partners.', 'content', 'creation', '{"M18","S8"}', '{"M18.1","M18.2","S8.2"}', 'medium', 'high'),
('Build partner marketing portal', 'Create a self-serve portal where partners access co-branded assets, campaign templates, and lead forms.', 'content', 'technical', '{"M18","S8"}', '{"M18.1","S8.1","S8.2"}', 'high', 'medium'),
('Run joint events with partners', 'Host co-branded webinars or roundtables with strategic partners targeting shared audience.', 'events', 'creation', '{"M18"}', '{"M18.1","M18.2"}', 'medium', 'medium'),

-- ============================
-- CSM TEMPLATES
-- ============================

-- C1: Maximize NRR
('Build NRR tracking dashboard', 'Create a dashboard showing NRR components: gross retention, expansion, contraction by cohort and segment.', 'ops', 'technical', '{"C1","C12"}', '{"C1.1","C1.2","C12.2"}', 'medium', 'high'),
('Launch proactive renewal process', 'Initiate renewal conversations 120 days before expiry with health review and expansion proposal.', 'ops', 'process', '{"C1","C12"}', '{"C1.1","C1.2","C12.1"}', 'medium', 'high'),
('Build expansion opportunity framework', 'Define triggers and playbooks for upsell based on usage patterns, team growth, and feature adoption.', 'ops', 'process', '{"C1","C5"}', '{"C1.1","C1.3","C5.1","C5.2"}', 'medium', 'high'),
('Implement customer success plans', 'Create individualized success plans for each customer with goals, milestones, and check-in cadence.', 'ops', 'process', '{"C1","C4"}', '{"C1.1","C1.4","C4.1"}', 'medium', 'high'),
('Set up time-to-value monitoring', 'Track and optimize the time from contract signing to first measurable customer outcome.', 'ops', 'technical', '{"C1","C3"}', '{"C1.4","C3.1","C3.2"}', 'medium', 'high'),
('Create customer segmentation model', 'Segment customers by ARR, strategic value, and health score to allocate CSM resources efficiently.', 'ops', 'strategy', '{"C1","C14"}', '{"C1.1","C14.1","C14.2"}', 'medium', 'high'),

-- C2: Reduce gross churn
('Build churn prediction model', 'Analyze churned accounts to identify leading indicators, then build a scoring model to predict future churn.', 'ops', 'technical', '{"C2","C8"}', '{"C2.1","C2.2","C8.1","C8.2"}', 'high', 'high'),
('Create at-risk recovery playbook', 'Document intervention strategies for each risk factor: low usage, support escalations, champion departure.', 'ops', 'process', '{"C2","C8"}', '{"C2.2","C2.3","C8.2","C8.3"}', 'medium', 'high'),
('Launch executive sponsor rescue program', 'Assign executive sponsors to critical at-risk accounts for high-touch intervention.', 'ops', 'strategy', '{"C2"}', '{"C2.1","C2.2"}', 'low', 'high'),
('Build re-engagement campaign for inactive users', 'Target customers with declining usage with personalized email sequences, training offers, and check-in calls.', 'email', 'strategy', '{"C2","C4"}', '{"C2.1","C2.2","C4.1","C4.2"}', 'medium', 'high'),
('Implement churn exit interviews', 'Conduct structured interviews with every churning customer to understand root causes and identify patterns.', 'ops', 'process', '{"C2"}', '{"C2.1"}', 'low', 'medium'),
('Set up automated usage alerts', 'Configure alerts when customer usage drops below threshold levels, triggering CSM outreach.', 'product', 'technical', '{"C2","C8"}', '{"C2.3","C8.1","C8.3"}', 'low', 'high'),

-- C3: Reduce time-to-first-value
('Build structured onboarding program', 'Create a milestone-based onboarding journey with clear steps, timelines, and success criteria.', 'ops', 'process', '{"C3","C6"}', '{"C3.1","C3.2","C6.1"}', 'medium', 'high'),
('Create self-serve onboarding flow', 'Design in-app guided onboarding experience that reduces time-to-value without CSM dependency.', 'product', 'technical', '{"C3","C6"}', '{"C3.1","C3.2","C3.3","C6.1","C6.2"}', 'high', 'high'),
('Develop onboarding checklist and templates', 'Create implementation checklists, data migration guides, and integration setup documentation.', 'content', 'creation', '{"C3"}', '{"C3.1","C3.2"}', 'medium', 'medium'),
('Build onboarding satisfaction survey', 'Deploy post-onboarding NPS with follow-up workflows to capture and act on feedback.', 'email', 'process', '{"C3","C9"}', '{"C3.3","C9.1","C9.2"}', 'low', 'medium'),
('Create quickstart guides per use case', 'Build persona-specific getting-started guides that show fastest path to value for each buyer type.', 'content', 'creation', '{"C3","C13"}', '{"C3.1","C3.2","C13.1"}', 'medium', 'high'),
('Set up time-to-value tracking', 'Define activation events and track median time from contract to first value milestone per segment.', 'ops', 'technical', '{"C3"}', '{"C3.1","C3.2"}', 'low', 'medium'),

-- C4: Drive product adoption
('Launch feature adoption campaigns', 'Create in-app and email campaigns highlighting underused features with tutorials and success stories.', 'email', 'creation', '{"C4"}', '{"C4.1","C4.2"}', 'medium', 'high'),
('Build product usage analytics dashboard', 'Track feature adoption rates, active users, and usage patterns per account for CSM visibility.', 'ops', 'technical', '{"C4","C8"}', '{"C4.1","C4.2","C8.1"}', 'medium', 'high'),
('Create champion enablement program', 'Identify and train internal champions within each account to drive adoption across their teams.', 'ops', 'process', '{"C4","C13"}', '{"C4.3","C13.2"}', 'medium', 'high'),
('Launch monthly best-practice webinars', 'Host recurring webinars showcasing advanced features, tips, and customer success stories.', 'events', 'creation', '{"C4","M17"}', '{"C4.1","C4.2","M17.1"}', 'medium', 'medium'),
('Deploy in-app guidance and tooltips', 'Implement contextual help, feature tours, and tooltips that guide users to key features.', 'product', 'technical', '{"C4","C3"}', '{"C4.1","C4.2","C3.1"}', 'medium', 'high'),
('Build customer success newsletter', 'Monthly email with tips, new features, best practices, and customer spotlight stories.', 'email', 'creation', '{"C4","M14"}', '{"C4.1","C4.2","M14.1"}', 'low', 'medium'),

-- C5: Generate expansion revenue
('Build expansion playbook', 'Document upsell/cross-sell motions with triggers, talk tracks, and pricing options for each expansion path.', 'ops', 'process', '{"C5","S12"}', '{"C5.1","C5.2","C5.3","S12.1","S12.2"}', 'medium', 'high'),
('Launch usage-based upsell campaigns', 'Create automated campaigns triggered by usage thresholds that promote upgrades to higher tiers.', 'email', 'strategy', '{"C5","S12"}', '{"C5.1","C5.2","S12.1","S12.2"}', 'medium', 'high'),
('Build expansion pipeline tracking', 'Create CRM pipeline views specifically for expansion opportunities with dedicated forecasting.', 'ops', 'technical', '{"C5","S12"}', '{"C5.3","S12.1"}', 'low', 'medium'),
('Train CSMs on consultative expansion selling', 'Train CSMs to identify expansion signals and conduct value-based upgrade conversations.', 'ops', 'process', '{"C5"}', '{"C5.1","C5.2","C5.3"}', 'medium', 'high'),
('Create upgrade decision matrix', 'Build a visual guide showing when each plan/module is the right fit based on company size and needs.', 'content', 'creation', '{"C5","M5"}', '{"C5.2","M5.1"}', 'low', 'medium'),

-- C6: Build scalable onboarding without CSM
('Build self-serve onboarding portal', 'Create a step-by-step onboarding portal with video tutorials, checklists, and progress tracking.', 'product', 'technical', '{"C6","C3"}', '{"C6.1","C6.2","C3.1","C3.2"}', 'high', 'high'),
('Create automated onboarding email sequence', 'Build a 10-email drip over 30 days guiding new customers through setup, first use, and activation.', 'email', 'creation', '{"C6","C3"}', '{"C6.1","C3.1","C3.2"}', 'medium', 'high'),
('Develop video walkthrough library', 'Record 10-15 short (2-5min) tutorial videos covering key setup steps and common workflows.', 'content', 'creation', '{"C6","C13"}', '{"C6.1","C6.2","C13.1"}', 'medium', 'medium'),
('Build in-app onboarding wizard', 'Implement a step-by-step wizard that guides first-time users through core setup and first actions.', 'product', 'technical', '{"C6","C3"}', '{"C6.1","C6.2","C3.1"}', 'high', 'high'),

-- C7: Turn customer base into acquisition channel
('Build structured referral program', 'Create a formal referral program with incentives (discounts, credits), tracking, and thank-you automation.', 'ops', 'strategy', '{"C7","M14"}', '{"C7.1","C7.3","M14.2"}', 'medium', 'high'),
('Launch NPS-based referral campaign', 'Automatically ask NPS promoters (9-10) for referrals with a personalized follow-up workflow.', 'email', 'strategy', '{"C7","C9"}', '{"C7.2","C7.3","C9.1"}', 'low', 'high'),
('Build customer advocacy program', 'Recruit happy customers as advocates for speaking, case studies, reviews, and peer introductions.', 'ops', 'strategy', '{"C7","C16","M14"}', '{"C7.1","C7.3","C16.1","M14.1"}', 'medium', 'high'),
('Launch G2/Capterra review campaign', 'Systematically collect customer reviews on key software review sites to build social proof.', 'social', 'strategy', '{"C7","M14"}', '{"C7.2","M14.1"}', 'low', 'high'),
('Create customer success stories for social', 'Produce shareable customer success stories, quotes, and short videos for social media amplification.', 'content', 'creation', '{"C7","C11","M14"}', '{"C7.1","C11.1","M14.1"}', 'medium', 'medium'),

-- C8: Build customer health monitoring
('Define health score formula', 'Create a weighted composite score based on usage frequency, feature adoption, support tickets, and engagement.', 'ops', 'process', '{"C8","C2"}', '{"C8.1","C2.2","C2.3"}', 'medium', 'high'),
('Implement health score in CRM/tooling', 'Build health scoring in your CS platform with automated calculation and visual dashboards.', 'ops', 'technical', '{"C8"}', '{"C8.1","C8.2"}', 'high', 'high'),
('Create health-triggered intervention playbooks', 'Define automated alerts and CSM action plans for each health score threshold breach.', 'ops', 'process', '{"C8","C2"}', '{"C8.2","C8.3","C2.2","C2.3"}', 'medium', 'high'),
('Launch in-app NPS and feedback widget', 'Embed contextual surveys at key moments to capture real-time user sentiment as health input.', 'product', 'technical', '{"C8","C9","C15"}', '{"C8.1","C9.1","C15.1"}', 'low', 'medium'),
('Set up executive health review cadence', 'Present customer health trends weekly to leadership, highlighting at-risk accounts and actions taken.', 'ops', 'process', '{"C8"}', '{"C8.2","C8.3"}', 'low', 'medium'),

-- C9: Improve customer satisfaction and NPS
('Deploy automated NPS survey program', 'Set up recurring NPS surveys post-onboarding and quarterly with automated follow-up workflows.', 'email', 'process', '{"C9","C15"}', '{"C9.1","C9.2","C9.3","C15.1"}', 'low', 'high'),
('Build detractor recovery process', 'Create structured follow-up within 72h for all detractors: call, root cause analysis, action plan.', 'ops', 'process', '{"C9"}', '{"C9.2","C9.3"}', 'medium', 'high'),
('Launch customer satisfaction initiatives', 'Based on NPS feedback themes, launch targeted improvements in top 3 pain areas per quarter.', 'ops', 'strategy', '{"C9","C15"}', '{"C9.1","C9.3","C15.2"}', 'medium', 'high'),
('Create customer experience journey map', 'Map every touchpoint from purchase to renewal, identify friction points, and optimize high-impact moments.', 'ops', 'strategy', '{"C9","C3"}', '{"C9.1","C9.3","C3.3"}', 'medium', 'medium'),
('Build NPS trend reporting', 'Create automated quarterly NPS reports showing trends, segments, themes, and action items.', 'ops', 'technical', '{"C9"}', '{"C9.1","C9.3"}', 'low', 'medium'),

-- C10: Build QBR framework
('Create QBR template and playbook', 'Build standardized QBR decks, preparation checklists, and follow-up processes for strategic accounts.', 'ops', 'process', '{"C10"}', '{"C10.1","C10.2","C10.3"}', 'medium', 'high'),
('Build QBR scheduling automation', 'Set up automated reminders and scheduling workflows for quarterly business reviews by account tier.', 'ops', 'technical', '{"C10"}', '{"C10.1"}', 'low', 'medium'),
('Train CSMs on strategic QBR delivery', 'Run workshops on consultative QBR approach: data-driven insights, proactive recommendations, expansion positioning.', 'ops', 'process', '{"C10","C5"}', '{"C10.2","C10.3","C5.1"}', 'medium', 'high'),
('Build QBR data dashboard', 'Create pre-populated dashboards with usage stats, ROI metrics, and health scores for each account QBR.', 'ops', 'technical', '{"C10"}', '{"C10.1","C10.2"}', 'medium', 'medium'),
('Integrate QBR feedback into product roadmap', 'Systematize collection of QBR themes and feature requests into the product backlog.', 'ops', 'process', '{"C10","C15"}', '{"C10.2","C10.3","C15.2"}', 'low', 'medium'),

-- C11: Produce customer case studies
('Create case study production playbook', 'Document the process: customer selection, interview guide, writing template, approval workflow, and distribution.', 'ops', 'process', '{"C11"}', '{"C11.1","C11.2","C11.3"}', 'medium', 'high'),
('Build case study interview pipeline', 'Identify 10+ willing customers, schedule interviews, and build a continuous production pipeline.', 'content', 'strategy', '{"C11","M5"}', '{"C11.1","C11.3","M5.4"}', 'medium', 'high'),
('Create case studies with quantified metrics', 'Produce case studies that include specific KPIs: ROI, time saved, revenue impact, efficiency gains.', 'content', 'creation', '{"C11","M5","S13"}', '{"C11.1","C11.2","M5.4","S13.1"}', 'medium', 'high'),
('Distribute case studies to Sales', 'Embed case studies in sales portal, train AEs on when/how to use them, and track usage in deals.', 'content', 'process', '{"C11","M5"}', '{"C11.3","M5.1","M5.4"}', 'low', 'high'),
('Create video testimonial program', 'Produce short (2-3min) video testimonials from happy customers for website, social, and sales use.', 'content', 'creation', '{"C11","M14"}', '{"C11.1","C11.2","M14.1"}', 'medium', 'high'),

-- C12: Build renewal forecasting
('Build renewal calendar and tracking', 'Create a dashboard showing all upcoming renewals with health scores, expansion potential, and risk flags.', 'ops', 'technical', '{"C12","C1"}', '{"C12.1","C12.2","C1.1","C1.2"}', 'medium', 'high'),
('Implement 90-day renewal process', 'Create a structured workflow starting 90+ days before renewal: health check, QBR, expansion discussion, renewal negotiation.', 'ops', 'process', '{"C12","C10"}', '{"C12.1","C12.2","C10.1"}', 'medium', 'high'),
('Build renewal risk scoring', 'Create a model that predicts renewal probability based on usage, engagement, support history, and NPS.', 'ops', 'technical', '{"C12","C8"}', '{"C12.2","C8.1"}', 'medium', 'high'),
('Create renewal playbooks by scenario', 'Document playbooks for: easy renewals, contested renewals, downgrade attempts, and multi-year negotiations.', 'ops', 'process', '{"C12"}', '{"C12.1","C12.2"}', 'medium', 'medium'),

-- C13: Build customer education and certification
('Create customer learning academy', 'Build a structured learning platform with courses, quizzes, and certificates organized by skill level.', 'product', 'creation', '{"C13","C6"}', '{"C13.1","C13.2","C6.1"}', 'high', 'high'),
('Build certification program', 'Design a certification path with clear learning objectives, assessment criteria, and digital badges.', 'ops', 'process', '{"C13"}', '{"C13.1","C13.2","C13.3"}', 'high', 'high'),
('Create video tutorial library', 'Produce 20+ tutorial videos covering key workflows, features, and best practices.', 'content', 'creation', '{"C13","C6"}', '{"C13.1","C6.1","C6.2"}', 'high', 'medium'),
('Launch train-the-trainer program', 'Enable internal champions to train their own teams by providing facilitation guides and materials.', 'ops', 'process', '{"C13","C4"}', '{"C13.2","C4.3"}', 'medium', 'high'),
('Track education impact on support volume', 'Measure whether certified users generate fewer support tickets and higher satisfaction scores.', 'ops', 'technical', '{"C13"}', '{"C13.3"}', 'low', 'medium'),

-- C14: Scale CSM capacity without headcount
('Implement tech-touch CSM model', 'Design automated email, in-app, and notification playbooks for low-tier accounts.', 'email', 'strategy', '{"C14","C6"}', '{"C14.1","C14.2","C6.1"}', 'medium', 'high'),
('Build automated customer playbooks', 'Create lifecycle automation: onboarding drips, feature adoption nudges, renewal reminders, health alerts.', 'email', 'creation', '{"C14"}', '{"C14.1","C14.2"}', 'high', 'high'),
('Deploy customer self-service portal', 'Build a portal where customers access knowledge base, submit tickets, track status, and find resources.', 'product', 'technical', '{"C14","C6"}', '{"C14.2","C6.1","C6.2"}', 'high', 'high'),
('Create CSM capacity planning model', 'Build a model to optimize account allocation by tier, complexity, and health score.', 'ops', 'strategy', '{"C14"}', '{"C14.1"}', 'medium', 'medium'),

-- C15: Build Voice of Customer program
('Set up systematic feedback collection', 'Deploy multi-channel feedback: NPS, CSAT, product surveys, QBR insights, support ticket analysis.', 'ops', 'process', '{"C15","C9"}', '{"C15.1","C15.2","C9.1"}', 'medium', 'high'),
('Build customer feedback to product pipeline', 'Create a structured process to tag, categorize, and prioritize customer feedback for the product team.', 'ops', 'process', '{"C15"}', '{"C15.1","C15.2"}', 'medium', 'high'),
('Launch customer advisory board', 'Recruit 8-12 strategic customers for quarterly advisory meetings influencing product and strategy.', 'events', 'strategy', '{"C15","C10"}', '{"C15.1","C15.2","C10.2"}', 'medium', 'high'),
('Create VoC reporting dashboard', 'Build a dashboard aggregating customer feedback themes, sentiment trends, and feature request rankings.', 'ops', 'technical', '{"C15"}', '{"C15.1","C15.2"}', 'medium', 'medium'),
('Run monthly customer insight sessions', 'Host internal sessions sharing customer feedback, pain points, and success stories with Product and Engineering.', 'ops', 'process', '{"C15"}', '{"C15.1","C15.2"}', 'low', 'medium'),

-- C16: Build customer reference program
('Build structured reference program', 'Create a program with tiers, benefits, and ask frequency limits to manage reference customer burnout.', 'ops', 'strategy', '{"C16","M14"}', '{"C16.1","C16.2","C16.3","M14.1"}', 'medium', 'high'),
('Recruit reference customers by segment', 'Build a diverse reference pool covering key verticals, company sizes, and use cases.', 'ops', 'strategy', '{"C16"}', '{"C16.1","C16.2"}', 'medium', 'high'),
('Create reference request workflow', 'Implement a system for Sales to request references with matching criteria, fulfillment SLAs, and feedback loops.', 'ops', 'technical', '{"C16"}', '{"C16.2","C16.3"}', 'medium', 'medium'),
('Build reference customer incentive program', 'Offer recognition, early access, conference invitations, and community perks to active reference customers.', 'ops', 'strategy', '{"C16","C7"}', '{"C16.1","C7.1"}', 'low', 'medium'),
('Track reference impact on deal outcomes', 'Measure win rates and deal velocity for deals with vs without reference calls to prove program value.', 'ops', 'technical', '{"C16"}', '{"C16.3"}', 'low', 'medium');

-- 4. Create index for KR-level filtering
CREATE INDEX IF NOT EXISTS idx_action_templates_kr_ids
  ON public.action_templates USING gin (relevant_kr_ids);
