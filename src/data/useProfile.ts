import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { qk } from '../lib/queryKeys'
import type { Profile } from '../domain/types'

export function useProfile() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: qk.profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').single()
      if (error) throw error
      return data as Profile
    },
  })
  const inv = () => qc.invalidateQueries({ queryKey: qk.profile })
  const update = useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const uid = (await supabase.auth.getUser()).data.user!.id
      const { error } = await supabase.from('profiles').update(patch).eq('id', uid)
      if (error) throw error
    },
    onSuccess: inv,
  })
  return { data: q.data, update: update.mutateAsync, isLoading: q.isLoading }
}
