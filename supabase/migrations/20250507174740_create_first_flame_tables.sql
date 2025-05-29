-- First create the ritual schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS ritual;

-- Add schema usage grant to service_role and anon roles
GRANT USAGE ON SCHEMA ritual TO service_role, anon, authenticated;

-- Create the quests table in the ritual schema
CREATE TABLE IF NOT EXISTS ritual.quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    realm TEXT,
    is_pinned BOOLEAN DEFAULT false
);

-- Create the flame_progress table in the ritual schema
CREATE TABLE IF NOT EXISTS ritual.flame_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    quest_id UUID NOT NULL REFERENCES ritual.quests(id),
    user_id UUID NOT NULL,
    current_day_target INTEGER NOT NULL DEFAULT 1,
    is_quest_complete BOOLEAN NOT NULL DEFAULT false,
    imprint_ref TEXT,
    UNIQUE(quest_id, user_id)
);

-- Create the messages table in the ritual schema
CREATE TABLE IF NOT EXISTS ritual.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    quest_id UUID NOT NULL REFERENCES ritual.quests(id),
    user_id UUID NOT NULL,
    author_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    UNIQUE(quest_id, user_id, role, author_id, content)
);

-- Add RLS policies to allow service_role access to all tables
ALTER TABLE ritual.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ritual.flame_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ritual.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for service_role
CREATE POLICY service_role_all_quests ON ritual.quests 
    FOR ALL TO service_role USING (true);

CREATE POLICY service_role_all_flame_progress ON ritual.flame_progress 
    FOR ALL TO service_role USING (true);

CREATE POLICY service_role_all_messages ON ritual.messages 
    FOR ALL TO service_role USING (true);

-- Create policies for authenticated users to see their own data
CREATE POLICY authenticated_select_quests ON ritual.quests 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY authenticated_select_flame_progress ON ritual.flame_progress 
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY authenticated_select_messages ON ritual.messages 
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Grant table permissions
GRANT ALL ON ritual.quests TO service_role;
GRANT ALL ON ritual.flame_progress TO service_role;
GRANT ALL ON ritual.messages TO service_role;

GRANT SELECT ON ritual.quests TO authenticated;
GRANT SELECT ON ritual.flame_progress TO authenticated;
GRANT SELECT ON ritual.messages TO authenticated;