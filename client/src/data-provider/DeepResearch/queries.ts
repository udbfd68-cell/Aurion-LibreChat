import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import { useQuery, useMutation } from '@tanstack/react-query';
import type {
  UseQueryOptions,
  UseMutationOptions,
  QueryObserverResult,
} from '@tanstack/react-query';
import type {
  DeepResearchPayload,
  DeepResearchResponse,
} from 'librechat-data-provider';

export const useStartDeepResearchMutation = (
  options?: UseMutationOptions<DeepResearchResponse, Error, DeepResearchPayload>,
) => {
  return useMutation<DeepResearchResponse, Error, DeepResearchPayload>(
    [MutationKeys.startDeepResearch],
    (data: DeepResearchPayload) => dataService.startDeepResearch(data),
    {
      ...options,
    },
  );
};
