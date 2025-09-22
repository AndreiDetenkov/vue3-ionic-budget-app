import { createClient } from '@supabase/supabase-js';
import { checkEnvVariable } from '@/core/utils/env';

interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          icon: string;
          id: string;
          title: string;
        };
        Insert: {
          icon?: string | null;
          id: string;
          title: string;
        };
        Update: {
          icon?: string | null;
          id?: string;
          title?: string;
        };
      };
      transactions: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          name: string;
          value: number;
        };
        Insert: {
          category_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          value: number;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          value?: number;
        };
      };
    };
  };
}

export const SUPABASE_URL = checkEnvVariable('VITE_SUPABASE_URL');
export const API_KEY = checkEnvVariable('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient<Database>(SUPABASE_URL, API_KEY);
