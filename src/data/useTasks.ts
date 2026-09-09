import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { qk } from '../lib/queryKeys'
import type { Task } from '../domain/types'

type NewTask = Pick<Task, 'direction_id' | 'title' | 'budget_blocks'>

// Appends after the last task of the same direction, archived ones included so
// that unarchiving cannot collide with a live row.
async function nextSortOrder(directionId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('direction_id', directionId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data?.sort_order ?? -1) + 1
}

export function useTasks(directionId?: string) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: qk.tasks,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .is('archived_at', null)
        .order('sort_order')
        .order('id')
      if (error) throw error
      return data as Task[]
    },
  })
  const inv = () => qc.invalidateQueries({ queryKey: qk.tasks })
  const create = useMutation({
    mutationFn: async (t: NewTask) => {
      const uid = (await supabase.auth.getUser()).data.user!.id
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...t, user_id: uid, sort_order: await nextSortOrder(t.direction_id) })
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: inv,
  })
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      const { error } = await supabase.from('tasks').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: inv,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: inv,
  })
  const all = q.data ?? []
  const data = directionId ? all.filter((t) => t.direction_id === directionId) : all
  return {
    data,
    create: create.mutateAsync,
    update: (id: string, patch: Partial<Task>) => update.mutateAsync({ id, patch }),
    toggleDone: (id: string) => {
      const done = all.find((t) => t.id === id)?.done_at
      return update.mutateAsync({ id, patch: { done_at: done ? null : new Date().toISOString() } })
    },
    remove: remove.mutateAsync,
    isLoading: q.isLoading,
  }
}
