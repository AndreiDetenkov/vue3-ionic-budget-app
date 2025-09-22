import { supabase } from '@/core/plugins/supabase';

type TransactionsResponse = Awaited<ReturnType<typeof getCategoriesApi>>;
export type CategoriesResponseSuccess = TransactionsResponse['data'];
export type CategoriesResponseError = TransactionsResponse['error'];

export async function getCategoriesApi() {
  return supabase.from('categories').select('*').order('title', { ascending: true });
}
