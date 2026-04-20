import { QueryKeys, dataService } from 'librechat-data-provider';
import { useQuery } from '@tanstack/react-query';
import type {
  UseQueryOptions,
  QueryObserverResult,
} from '@tanstack/react-query';
import type { TMCPRegistryResponse } from 'librechat-data-provider';

export const useMCPRegistryQuery = (
  category?: string,
  config?: UseQueryOptions<TMCPRegistryResponse>,
): QueryObserverResult<TMCPRegistryResponse> => {
  return useQuery<TMCPRegistryResponse>(
    [QueryKeys.mcpRegistry, category],
    () => dataService.getMCPRegistry(category),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000,
      ...config,
    },
  );
};
