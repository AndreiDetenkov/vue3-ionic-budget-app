import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from './database.types';
import type {
  BudgetStorage,
  Category,
  CreateTransactionInput,
  DateRange,
  Transaction,
  UpdateTransactionInput,
} from './types';

type TransactionRowWithCategory = Tables<'transactions'> & {
  categories: Tables<'categories'> | null;
};

function readRequiredEnv(envKey: string): string {
  const value = import.meta.env[envKey];
  if (!value) {
    throw new Error(`Env variable ${envKey} is required`);
  }
  return value;
}

function mapTransactionRow(row: TransactionRowWithCategory): Transaction {
  if (!row.categories) {
    throw new Error(`Transaction ${row.id} is missing its associated category`);
  }

  return {
    id: row.id,
    name: row.name,
    value: row.value,
    createdAt: row.created_at,
    categoryId: row.category_id,
    category: {
      id: row.categories.id,
      title: row.categories.title,
      icon: row.categories.icon,
    },
  };
}

export function createSupabaseStorage(): BudgetStorage {
  let client: SupabaseClient<Database> | null = null;

  function getClient(): SupabaseClient<Database> {
    if (!client) {
      const supabaseUrl = readRequiredEnv('VITE_SUPABASE_URL');
      const supabaseKey = readRequiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
      client = createClient<Database>(supabaseUrl, supabaseKey);
    }
    return client;
  }

  return {
    async getTransactionsByRange({ from, to }: DateRange): Promise<Transaction[]> {
      const { data, error } = await getClient()
        .from('transactions')
        .select('*,categories(*)')
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return [];
      }

      return data.map(mapTransactionRow);
    },

    async createTransaction(input: CreateTransactionInput): Promise<void> {
      const { error } = await getClient()
        .from('transactions')
        .insert([
          {
            name: input.name,
            value: input.value,
            category_id: input.categoryId,
          },
        ])
        .select();

      if (error) {
        throw new Error(error.message);
      }
    },

    async updateTransaction({ id, name, value, categoryId }: UpdateTransactionInput): Promise<void> {
      const { error } = await getClient()
        .from('transactions')
        .update({
          name,
          value,
          category_id: categoryId,
        })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },

    async removeTransaction(id: string): Promise<void> {
      const { error } = await getClient().from('transactions').delete().eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },

    async getCategories(): Promise<Category[]> {
      const { data, error } = await getClient().from('categories').select('*').order('title', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return [];
      }

      return data.map((row) => ({
        id: row.id,
        title: row.title,
        icon: row.icon,
      }));
    },
  };
}
