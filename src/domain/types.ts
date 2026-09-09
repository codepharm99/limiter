export type Mode = 'work' | 'break'
export type SessionStatus = 'running' | 'done' | 'skipped' | 'aborted'
export interface Profile { id: string; locale: 'ru'|'en'; is_pro: boolean; week_cap_blocks: number; work_min: number; short_break_min: number; long_break_min: number }
export interface Direction { id: string; user_id: string; name: string; color: string; icon: string; budget_blocks: number; cadence: 'weekly'; active_days: number[]; is_system: boolean; sort_order: number; archived_at: string | null }
export interface Task { id: string; user_id: string; direction_id: string; title: string; budget_blocks: number; done_at: string | null; sort_order: number; archived_at: string | null }
export interface Session { id: string; user_id: string; direction_id: string | null; task_id: string | null; mode: Mode; planned_sec: number; actual_sec: number; blocks: number; note: string | null; energy: number | null; parallel_group: string | null; started_at: string; ended_at: string | null; status: SessionStatus; manual: boolean }
export interface DayPlan { id: string; user_id: string; direction_id: string; task_id: string | null; date: string; planned_blocks: number }
export interface Track { id: string; user_id: string; title: string; url: string; sort_order: number }
