export type Network = string;

export type WalletAddressResponse = string;

export type BalanceItem = {
  network: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
};

export type SupportedToken = {
  id: number;
  network: string;
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  enabled: boolean;
};

export type TransactionItem = {
  id: string;
  fromAddress: string;
  toAddress: string;
  tokenAddress: string;
  amount: string;
  network: string;
  txHash: string;
  createdAt: string;
  updatedAt: string;
};



