import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/core/config/supabase/types';
import { API_KEY, SUPABASE_URL } from '@/core/config';

export const supabase = createClient<Database>(SUPABASE_URL, API_KEY);
