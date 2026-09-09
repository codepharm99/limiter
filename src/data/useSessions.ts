import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { qk } from '../lib/queryKeys'
import type { Session } from '../domain/types'

type NewSession = Pick<Session, 'direction_id' | 'task_id' | 'mode' | 'planned_sec'>
type FinishPatch = Pick<Session, 'actual_sec' | 'status' | 'note' | 'energy'>
type ManualSession = Pick<
  Session,
  'direction_id' | 'task_id' | 'actual_sec' | 'started_at' | 'note' | 'energy'
>

export function useSessions(from: Date, to: Date) {
  const qc = useQueryClient()
  const fromIso = from.toISOString()
  const toIso = to.toISOString()
  const key = qk.sessions(fromIso, toIso)
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .gte('started_at', fromIso)
        .lt('started_at', toIso)
        .order('started_at')
        .order('id')
      if (error) throw error
      return data as Session[]
    },
  })
  const inv = () => qc.invalidateQueries({ queryKey: ['sessions'] })
  const start = useMutation({
    mutationFn: async (s: NewSession) => {
      const uid = (await supabase.auth.getUser()).data.user!.id
      const { data, error } = await supabase
        .from('sessions')
        .insert({ ...s, user_id: uid, started_at: new Date().toISOString(), status: 'running' })
        .select()
        .single()
      if (error) throw error
      return data as Session
    },
    onSuccess: inv,
  })
  const finish = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: FinishPatch }) => {
      const { error } = await supabase
        .from('sessions')
        .update({ ...patch, ended_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: inv,
  })
  const addManual = useMutation({
    mutationFn: async (s: ManualSession) => {
      const uid = (await supabase.auth.getUser()).data.user!.id
      const started = new Date(s.started_at)
      const { error } = await supabase.from('sessions').insert({
        ...s,
        user_id: uid,
        mode: 'work',
        planned_sec: s.actual_sec,
        status: 'done',
        manual: true,
        ended_at: new Date(started.getTime() + s.actual_sec * 1000).toISOString(),
      })
      if (error) throw error
    },
    onSuccess: inv,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: inv,
  })
  const insertMany = useMutation({
    mutationFn: async (rows: Partial<Session>[]) => {
      const uid = (await supabase.auth.getUser()).data.user!.id
      // blocks is a generated column, postgres rejects it on insert
      const payload = rows.map(({ blocks: _blocks, ...r }) => ({ ...r, user_id: uid }))
      const { error } = await supabase.from('sessions').insert(payload)
      if (error) throw error
    },
    onSuccess: inv,
  })
  return {
    data: q.data ?? [],
    start: start.mutateAsync,
    finish: (id: string, patch: FinishPatch) => finish.mutateAsync({ id, patch }),
    addManual: addManual.mutateAsync,
    remove: remove.mutateAsync,
    insertMany: insertMany.mutateAsync,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
  }
}
