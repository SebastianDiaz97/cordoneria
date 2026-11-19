import { supabase, unwrap } from '@/lib/supabase'
import type { Profile, Role } from '@/types'

export async function listProfiles() {
  return unwrap<Profile[]>(
    supabase.from('profiles').select('*').order('full_name'),
  )
}

export async function updateProfile(
  id: string,
  input: { full_name?: string; role?: Role; is_active?: boolean },
) {
  return unwrap<Profile>(
    supabase.from('profiles').update(input).eq('id', id).select('*').single(),
  )
}
