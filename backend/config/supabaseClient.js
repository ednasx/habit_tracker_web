import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('[Supabase] URL or Service Role Key is not set. Supabase client will not work yet.')
}

export const supabaseAdmin = createClient(supabaseUrl ?? '', supabaseServiceRoleKey ?? '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
