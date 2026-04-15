import { createClient } from './supabase/client'
import type { Profile } from './types'

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}
