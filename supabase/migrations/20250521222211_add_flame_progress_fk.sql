-- 20250521222211_add_flame_progress_fk.sql
-- Adds a foreign key constraint linking flame_progress.quest_id to quests(id).
-- Rolls back if existing rows violate the constraint.

begin;
  begin
    alter table ritual.flame_progress
      add constraint flame_progress_quest_fk
      foreign key (quest_id) references ritual.quests(id);
  exception when foreign_key_violation then
    rollback;
  end;
commit;
