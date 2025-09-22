import { createClient } from '@supabase/supabase-js';
import { checkEnvVariable } from '@/core/utils/env';
import type { Database } from '@/core/plugins/database.types';

export const SUPABASE_URL = checkEnvVariable('VITE_SUPABASE_URL');
export const API_KEY = checkEnvVariable('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient<Database>(SUPABASE_URL, API_KEY);
