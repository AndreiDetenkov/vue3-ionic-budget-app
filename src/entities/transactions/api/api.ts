import { Database, supabase } from '@/shared/config/supabase';
import { RangeInterface } from '@/entities/transactions';

type TransactionsResponse = Awaited<ReturnType<typeof getTransactionsByRangeApi>>;
export type TransactionsResponseSuccess = TransactionsResponse['data'];
export type TransactionsResponseError = TransactionsResponse['error'];

export async function getTransactionsByRangeApi({ from, to }: RangeInterface) {
  return supabase
    .from('transactions')
    .select(`id,name,value,created_at,category_id, categories(id,title,icon)`)
    .gt('created_at', from)
    .lt('created_at', to)
    .order('created_at', { ascending: false });
}
