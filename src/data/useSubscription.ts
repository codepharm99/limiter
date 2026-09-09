import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { qk } from '../lib/queryKeys'
import { isProActive, type SubscriptionState } from '../../supabase/functions/_shared/billing'

export type Subscription = SubscriptionState

/**
 * Own subscription row only — RLS hides everyone else's, and no browser path
 * can write it. Pro is derived here from that server-controlled state, never
 * from profiles.is_pro.
 */
export function useSubscription() {
  const q = useQuery({
    queryKey: qk.subscription,
    queryFn: async () => {
      const { data, error } = await supabase.from('subscriptions').select('*').maybeSingle()
      if (error) throw error
      return (data ?? null) as Subscription | null
    },
  })
  return { data: q.data ?? null, isLoading: q.isLoading, refetch: q.refetch }
}

export function usePro() {
  const { data, isLoading, refetch } = useSubscription()
  const pro = isProActive(data, new Date())
  return { pro, subscription: data, isLoading, refetch }
}
