import { supabase } from '@/shared/config/supabase';
import { CreateTransactionPayload, RangeInterface } from '@/entities/transactions';

type TransactionsResponse = Awaited<ReturnType<typeof getTransactionsByRangeApi>>;
export type TransactionsResponseSuccess = TransactionsResponse['data'];
export type TransactionsResponseError = TransactionsResponse['error'];

export async function getTransactionsByRangeApi({ from, to }: RangeInterface) {
  return supabase
    .from('transactions')
    .select(`*,categories(*)`)
    .gt('created_at', from)
    .lt('created_at', to)
    .order('created_at', { ascending: false });
}

export async function createTransactionApi(payload: CreateTransactionPayload) {
  return supabase.from('transactions').insert([payload]);
}
