-- The table-level unique (user_id, direction_id, task_id, date) does not dedupe
-- rows with a null task_id, so two concurrent writes could both insert a
-- direction-level plan. This partial index closes that hole.
create unique index if not exists day_plans_direction_day_unique
  on day_plans(user_id, direction_id, date)
  where task_id is null;
