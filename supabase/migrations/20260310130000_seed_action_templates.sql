-- Seed action templates for marketing plan suggestions
INSERT INTO public.action_templates (title, description, channel, action_type, relevant_objectives, effort, impact) VALUES

-- SEO & Content
('Launch SEO content cluster on core topic', 'Create 8-12 interlinked articles around your primary keyword theme to build topical authority and drive organic traffic.', 'seo', 'creation', '{"M2","M6","M1"}', 'high', 'high'),
('Publish weekly blog cadence', 'Establish a consistent publishing rhythm of 1-2 SEO-optimized articles per week targeting bottom-of-funnel keywords.', 'content', 'creation', '{"M2","M6"}', 'medium', 'medium'),
('Build a benchmark report or industry index', 'Produce a flagship data-driven report that positions your company as the reference in your category.', 'content', 'creation', '{"M4","M3","M15"}', 'high', 'high'),
('Create customer case study library', 'Interview 5-10 customers and produce structured case studies with measurable results for sales enablement.', 'content', 'creation', '{"M5","M14","C11","C16","S13"}', 'medium', 'high'),
('Launch a resource center or knowledge hub', 'Build a dedicated section on the website with guides, templates, and tools that captures leads via gated content.', 'content', 'creation', '{"M2","M6","M1"}', 'high', 'high'),

-- Paid & Demand Gen
('Set up LinkedIn ABM campaign', 'Target priority accounts with personalized LinkedIn ad sequences driving to tailored landing pages.', 'paid', 'strategy', '{"M13","M1","S5"}', 'medium', 'high'),
('Launch Google Ads on branded + competitor keywords', 'Capture high-intent search traffic with branded, competitor, and category keyword campaigns.', 'paid', 'technical', '{"M1","M9","M11"}', 'medium', 'medium'),
('Build a retargeting funnel for website visitors', 'Set up multi-touch retargeting sequences across LinkedIn and Google to nurture site visitors.', 'paid', 'technical', '{"M1","M9","M11"}', 'low', 'medium'),
('Run a paid webinar promotion campaign', 'Promote upcoming webinars through paid social and email to drive registrations and pipeline.', 'paid', 'strategy', '{"M17","M1","M11"}', 'low', 'medium'),

-- Email & Nurture
('Build a lead nurture email sequence', 'Create a 5-7 email automated sequence that educates leads and drives them toward a demo request.', 'email', 'creation', '{"M1","M11","M2"}', 'medium', 'high'),
('Deploy NPS survey automation', 'Set up automated NPS surveys post-onboarding and quarterly, with follow-up workflows for detractors.', 'email', 'process', '{"C9","C15","C8"}', 'low', 'medium'),
('Launch a customer newsletter', 'Create a monthly newsletter sharing product updates, tips, case studies, and industry insights.', 'email', 'creation', '{"M14","C4","C7"}', 'low', 'medium'),
('Build a re-engagement campaign for inactive accounts', 'Target customers with declining usage with a personalized email sequence and special offers.', 'email', 'strategy', '{"C2","C4","C8"}', 'medium', 'high'),

-- Events
('Organize a quarterly customer roundtable', 'Host intimate virtual events with 10-15 customers to gather feedback, share roadmap, and build loyalty.', 'events', 'strategy', '{"C10","C15","C7","M14"}', 'medium', 'medium'),
('Launch a webinar series on category topics', 'Plan and execute monthly webinars featuring internal experts and guest speakers.', 'events', 'creation', '{"M17","M3","M15"}', 'medium', 'high'),
('Attend 3 industry conferences as sponsor', 'Select and sponsor key industry events with booth, speaking slots, and pre/post-event outreach.', 'events', 'strategy', '{"M7","M3","M8"}', 'high', 'high'),

-- Outbound
('Build outbound SDR playbook', 'Document the ideal customer profile, messaging sequences, objection handling, and cadence for SDR outreach.', 'outbound', 'process', '{"S9","S5","S2"}', 'medium', 'high'),
('Launch a multi-channel outbound sequence', 'Create a 12-touch sequence combining email, LinkedIn, and phone across 3 weeks targeting ICP accounts.', 'outbound', 'creation', '{"S9","S5","M1"}', 'medium', 'high'),
('Set up intent data monitoring', 'Deploy tools to identify accounts showing buying signals and route them to SDR outreach.', 'outbound', 'technical', '{"S5","S9","S11"}', 'medium', 'medium'),

-- Social
('Launch LinkedIn founder content program', 'Plan and publish 3 LinkedIn posts per week from the founder covering industry insights and company story.', 'social', 'creation', '{"M15","M3","M8"}', 'medium', 'high'),
('Build an employee advocacy program', 'Enable and train team members to share company content on LinkedIn with pre-written posts.', 'social', 'process', '{"M7","M3","M12"}', 'low', 'medium'),

-- Product
('Build a self-serve onboarding flow', 'Design and implement an in-app guided onboarding experience reducing time-to-value without CSM dependency.', 'product', 'technical', '{"C3","C6","C4"}', 'high', 'high'),
('Launch an in-app NPS and feedback widget', 'Embed contextual surveys at key moments in the product to capture real-time user sentiment.', 'product', 'technical', '{"C9","C15","C4"}', 'low', 'medium'),
('Create a customer education academy', 'Build a structured learning platform with courses, certifications, and achievement badges.', 'product', 'creation', '{"C13","C6","C4"}', 'high', 'high'),

-- Process & Ops
('Set up a customer health scoring model', 'Define and implement a health score based on usage, engagement, support tickets, and renewal date.', 'ops', 'process', '{"C8","C2","C12"}', 'medium', 'high'),
('Build a QBR framework and templates', 'Create standardized QBR decks, preparation checklists, and follow-up processes for strategic accounts.', 'ops', 'process', '{"C10","C5","C1"}', 'medium', 'medium'),
('Implement a renewal forecasting dashboard', 'Build a dashboard tracking renewal probability, risk factors, and expansion opportunities.', 'ops', 'technical', '{"C12","C1","C2"}', 'medium', 'high'),
('Build a partner co-marketing playbook', 'Document joint marketing activities, asset sharing, and lead routing processes with strategic partners.', 'ops', 'process', '{"M18","S8"}', 'medium', 'medium'),
('Set up marketing attribution model', 'Implement multi-touch attribution to measure marketing contribution to pipeline and revenue.', 'ops', 'technical', '{"M9","M1","M11"}', 'high', 'medium'),
('Create a GTM launch checklist', 'Build a repeatable launch process covering messaging, enablement, campaigns, and success metrics.', 'ops', 'process', '{"M10","M5","S2"}', 'medium', 'high'),

-- Hiring
('Hire a demand gen manager', 'Recruit an experienced demand generation leader to own pipeline targets and campaign strategy.', 'ops', 'hiring', '{"M11","M1","M9"}', 'high', 'high'),
('Hire a content marketing specialist', 'Recruit a writer/content strategist to own the blog, SEO content, and thought leadership pipeline.', 'ops', 'hiring', '{"M2","M6","M4"}', 'high', 'medium');
