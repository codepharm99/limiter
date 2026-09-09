import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { qk } from '../lib/queryKeys'
import type { Direction } from '../domain/types'

type NewDirection = Pick<Direction, 'name' | 'color' | 'icon' | 'budget_blocks' | 'active_days'>

// Appends after the last user direction. The system direction keeps the 1000 the
// signup trigger gives it, so it is excluded from the max.
async function nextSortOrder() {
  const { data, error } = await supabase
    .from('directions')
    .select('sort_order')
    .eq('is_system', false)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data?.sort_order ?? -1) + 1
}

export function useDirections() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: qk.directions,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('directions')
        .select('*')
        .is('archived_at', null)
        .order('sort_order')
        .order('id')
      if (error) throw error
      return data as Direction[]
    },
  })
  const inv = () => qc.invalidateQueries({ queryKey: qk.directions })
  const create = useMutation({
    mutationFn: async (d: NewDirection) => {
      const uid = (await supabase.auth.getUser()).data.user!.id
      const { data, error } = await supabase
        .from('directions')
        .insert({ ...d, user_id: uid, sort_order: await nextSortOrder() })
        .select()
        .single()
      if (error) throw error
      return data as Direction
    },
    onSuccess: inv,
  })
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Direction> }) => {
      const { error } = await supabase.from('directions').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: inv,
  })
  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('directions')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: inv,
  })
  const data = q.data ?? []
  return {
    data: data.filter((d) => !d.is_system),
    other: data.find((d) => d.is_system),
    create: create.mutateAsync,
    update: (id: string, patch: Partial<Direction>) => update.mutateAsync({ id, patch }),
    archive: archive.mutateAsync,
    isLoading: q.isLoading,
  }
}
