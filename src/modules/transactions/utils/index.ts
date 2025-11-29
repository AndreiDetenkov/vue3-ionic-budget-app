import { Transaction, TransactionsResponseSuccess } from '@/modules/transactions';

export const mappedTransactions = (transactions: TransactionsResponseSuccess): Transaction[] => {
  if (!transactions) {
    return [];
  }

  return transactions.map((item) => ({
    id: item.id,
    name: item.name,
    value: item.value,
    createdAt: item.created_at,
    categoryId: item.category_id,
    category: {
      id: item.categories.id,
      title: item.categories.title,
      icon: item.categories.icon,
    },
  }));
};
