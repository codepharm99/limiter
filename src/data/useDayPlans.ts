import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { qk } from '../lib/queryKeys'
import type { DayPlan } from '../domain/types'

// Postgres unique_violation. Two concurrent set() calls can both miss the lookup;
// the loser of the insert race retries as an update instead of surfacing an error.
const UNIQUE_VIOLATION = '23505'

export function useDayPlans(date: string) {
  const qc = useQueryClient()
  const key = qk.dayPlans(date)
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_plans')
        .select('*')
        .eq('date', date)
        .order('id')
      if (error) throw error
      return data as DayPlan[]
    },
  })
  const inv = () => qc.invalidateQueries({ queryKey: key })
  const set = useMutation({
    mutationFn: async ({
      directionId,
      taskId,
      planned,
    }: {
      directionId: string
      taskId: string | null
      planned: number
    }) => {
      const uid = (await supabase.auth.getUser()).data.user!.id
      // Read fresh, never from the query cache: a second call before the refetch
      // would insert again.
      const findExisting = async () => {
        const lookup = supabase
          .from('day_plans')
          .select('id')
          .eq('direction_id', directionId)
          .eq('date', date)
        const { data, error } = await (
          taskId === null ? lookup.is('task_id', null) : lookup.eq('task_id', taskId)
        )
          .order('id')
          .limit(1)
        if (error) throw error
        return data[0]
      }
      const updateRow = async (id: string) => {
        const { error } = await supabase
          .from('day_plans')
          .update({ planned_blocks: planned })
          .eq('id', id)
        if (error) throw error
      }

      const existing = await findExisting()
      if (planned <= 0) {
        if (!existing) return
        const { error } = await supabase.from('day_plans').delete().eq('id', existing.id)
        if (error) throw error
        return
      }
      if (existing) {
        await updateRow(existing.id)
        return
      }
      const { error } = await supabase.from('day_plans').insert({
        user_id: uid,
        direction_id: directionId,
        task_id: taskId,
        date,
        planned_blocks: planned,
      })
      if (!error) return
      if (error.code !== UNIQUE_VIOLATION) throw error
      const raced = await findExisting()
      if (!raced) throw error
      await updateRow(raced.id)
    },
    onSuccess: inv,
  })
  return {
    data: q.data ?? [],
    set: (directionId: string, taskId: string | null, planned: number) =>
      set.mutateAsync({ directionId, taskId, planned }),
    isLoading: q.isLoading,
  }
}
