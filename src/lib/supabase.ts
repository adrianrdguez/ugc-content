import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente público (para formularios UGC)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente con permisos de servicio (para API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type { Database } from './database.types'