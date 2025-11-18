import { supabase } from '@/core/plugins/supabase';
// import { QueryData, QueryError } from '@supabase/supabase-js';

type TransactionsResponse = Awaited<ReturnType<typeof getCategoriesApi>>;
export type CategoriesResponseSuccess = TransactionsResponse['data'];
export type CategoriesResponseError = TransactionsResponse['error'];

export async function getCategoriesApi() {
  return supabase.from('categories').select('*').order('title', { ascending: true });
}

// const categoriesQuery = supabase.from('categories').select('*').order('title', { ascending: true });
//
// type CategoriesData = QueryData<typeof categoriesQuery>;
// type CategoriesError = QueryError;
