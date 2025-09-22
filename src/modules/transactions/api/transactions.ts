import type { TransactionPayload, RangeInterface, TransactionItemsForUpdate } from '@/modules/transactions/types';
import { supabase } from '@/core/plugins/supabase';

type TransactionsResponse = Awaited<ReturnType<typeof getTransactionsByRangeApi>>;
export type TransactionsResponseSuccess = TransactionsResponse['data'];
export type TransactionsResponseError = TransactionsResponse['error'];

export async function getTransactionsByRangeApi({ from, to }: RangeInterface) {
  return supabase
    .from('transactions')
    .select(`*,categories(*)`)
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: false });
}

export async function createTransactionApi(payload: TransactionPayload) {
  return supabase.from('transactions').insert([payload]).select();
}

export async function removeTransactionApi(id: string) {
  return supabase.from('transactions').delete().eq('id', id);
}

export async function updateTransactionApi({ id, name, value, categoryId }: TransactionItemsForUpdate) {
  return supabase.from('transactions').update({ name, value, category_id: categoryId }).eq('id', id);
}
