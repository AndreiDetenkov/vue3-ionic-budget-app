import { supabase } from '@/shared/config/supabase';

type TransactionsResponse = Awaited<ReturnType<typeof getCategoriesApi>>;
export type CategoriesResponseSuccess = TransactionsResponse['data'];
export type CategoriesResponseError = TransactionsResponse['error'];

export async function getCategoriesApi() {
  return supabase.from('categories').select(`id,title,icon`).order('title', { ascending: true });
}
