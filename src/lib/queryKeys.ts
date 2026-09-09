export const qk = {
  profile: ['profile'],
  directions: ['directions'],
  tasks: ['tasks'],
  sessions: (from: string, to: string) => ['sessions', from, to],
  dayPlans: (date: string) => ['dayPlans', date],
  tracks: ['tracks'],
} as const
