'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBalances,
  fetchSupportedTokens,
  fetchTransactions,
  fetchWalletAddress,
  postTransfer,
} from '@/lib/api';
import type { BalanceItem, SupportedToken, TransactionItem } from '@/lib/types';

export function useWalletAddress() {
  return useQuery({
    queryKey: ['wallet-address'],
    queryFn: fetchWalletAddress,
  });
}

export function useBalances(address?: string) {
  return useQuery<BalanceItem[]>({
    queryKey: ['balances', address],
    queryFn: () => fetchBalances(address!),
    enabled: !!address,
  });
}

export function useSupportedTokens(network?: string) {
  return useQuery<SupportedToken[]>({
    queryKey: ['supported-tokens', network],
    queryFn: () => fetchSupportedTokens(network!),
    enabled: !!network,
  });
}

export function useTransactions(address?: string, token?: string) {
  return useQuery<TransactionItem[]>({
    queryKey: ['transactions', address, token],
    queryFn: () => fetchTransactions(address!, token!),
    enabled: !!address && !!token,
  });
}

export function useTransfer() {
  const qc = useQueryClient();
  return useMutation<
    { hash: string },
    Error,
    { network: string; to: string; token: string; amount: string }
  >({
    mutationFn: postTransfer,
    onSuccess: () => {
      // Invalidate transactions and balances
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
    },
  });
}
