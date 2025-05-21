-- Convert legacy slug references to UUID
UPDATE ritual.flame_progress
SET quest_id = (SELECT id FROM ritual.quests WHERE slug='first-flame-ritual')
WHERE quest_id = 'first-flame-ritual';

-- TODO: add FOREIGN KEY constraint once data is clean
