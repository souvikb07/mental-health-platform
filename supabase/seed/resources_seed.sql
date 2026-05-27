-- Phase 1 curated resources seed
-- Verify country-specific resources before adding them to production.

insert into public.resources (country, topic, category, name, description, url, phone, priority, verified_at)
values
('global', 'self_harm', 'crisis', 'Find a Helpline', 'Find free emotional support by country and topic.', 'https://findahelpline.com', null, 1, current_date),
('global', 'crisis', 'crisis', 'Find a Helpline', 'Global directory for helplines and emotional support services.', 'https://findahelpline.com', null, 1, current_date),
('global', 'emergency', 'emergency', 'Local emergency services', 'If there is immediate danger, contact local emergency services or go to the nearest emergency department.', null, null, 1, current_date),
('global', 'general', 'self_reflection', 'Prepare notes for a professional', 'Write down what changed, how long it has been happening, what is affected, and what support you want.', null, null, 50, current_date),
('global', 'general', 'peer_support', 'Trusted person check-in', 'Choose one trusted person and send a simple message asking to talk or sit with you.', null, null, 60, current_date);
