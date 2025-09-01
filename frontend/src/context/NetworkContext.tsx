'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNetworks } from '@/lib/api';

type NetworkContextValue = {
  networks: string[];
  selected: string | null;
  setSelected: (n: string) => void;
  isLoading: boolean;
};

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider');
  return ctx;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['networks'],
    queryFn: fetchNetworks,
  });

  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && data && data.length > 0 && !selected) {
      setSelected(data[0]);
    }
  }, [data, isLoading, selected]);

  const value = useMemo<NetworkContextValue>(
    () => ({
      networks: data ?? [],
      selected,
      setSelected,
      isLoading,
    }),
    [data, isLoading, selected],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
