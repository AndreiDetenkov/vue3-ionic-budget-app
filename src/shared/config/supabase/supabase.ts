import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/config/supabase/types';
import { API_KEY, SUPABASE_URL } from '@/shared/config';

export const supabase = createClient<Database>(SUPABASE_URL, API_KEY);
