import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type {
  UseQueryOptions,
  UseMutationOptions,
  QueryObserverResult,
} from '@tanstack/react-query';
import type {
  TArtifact,
  SaveArtifactPayload,
  ShareArtifactPayload,
} from 'librechat-data-provider';

export const useArtifactsQuery = (
  conversationId?: string,
  config?: UseQueryOptions<TArtifact[]>,
): QueryObserverResult<TArtifact[]> => {
  return useQuery<TArtifact[]>(
    [QueryKeys.artifacts, conversationId],
    () => dataService.getArtifacts(conversationId),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};

export const useArtifactVersionsQuery = (
  identifier: string,
  config?: UseQueryOptions<TArtifact[]>,
): QueryObserverResult<TArtifact[]> => {
  return useQuery<TArtifact[]>(
    [QueryKeys.artifactVersions, identifier],
    () => dataService.getArtifactVersions(identifier),
    {
      enabled: !!identifier,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useSharedArtifactQuery = (
  shareId: string,
  config?: UseQueryOptions<TArtifact>,
): QueryObserverResult<TArtifact> => {
  return useQuery<TArtifact>(
    [QueryKeys.sharedArtifact, shareId],
    () => dataService.getSharedArtifact(shareId),
    {
      enabled: !!shareId,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useSaveArtifactMutation = (
  options?: UseMutationOptions<TArtifact, Error, SaveArtifactPayload>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TArtifact, Error, SaveArtifactPayload>(
    [MutationKeys.saveArtifact],
    (data: SaveArtifactPayload) => dataService.saveArtifact(data),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.artifacts]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export type ShareArtifactMutationParams = {
  artifactId: string;
  data: ShareArtifactPayload;
};

export const useShareArtifactMutation = (
  options?: UseMutationOptions<TArtifact, Error, ShareArtifactMutationParams>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TArtifact, Error, ShareArtifactMutationParams>(
    [MutationKeys.shareArtifact],
    ({ artifactId, data }: ShareArtifactMutationParams) =>
      dataService.shareArtifact(artifactId, data),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.artifacts]);
        options?.onSuccess?.(...params);
      },
    },
  );
};
