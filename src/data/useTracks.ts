import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { qk } from '../lib/queryKeys'
import type { Track } from '../domain/types'

async function nextSortOrder() {
  const { data, error } = await supabase
    .from('tracks')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data?.sort_order ?? -1) + 1
}

export function useTracks() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: qk.tracks,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('sort_order')
        .order('id')
      if (error) throw error
      return data as Track[]
    },
  })
  const inv = () => qc.invalidateQueries({ queryKey: qk.tracks })
  const add = useMutation({
    mutationFn: async ({ title, url }: { title: string; url: string }) => {
      const uid = (await supabase.auth.getUser()).data.user!.id
      const { error } = await supabase
        .from('tracks')
        .insert({ title, url, user_id: uid, sort_order: await nextSortOrder() })
      if (error) throw error
    },
    onSuccess: inv,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tracks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: inv,
  })
  return {
    data: q.data ?? [],
    add: (title: string, url: string) => add.mutateAsync({ title, url }),
    remove: remove.mutateAsync,
    isLoading: q.isLoading,
  }
}
