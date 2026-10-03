import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jnfnfszekfstuoiemkgf.supabase.co'
const supabasePublishableKey = 'sb_publishable_wzqOa8ecTShc1fKxbVBtgw_7KYlpSao'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})