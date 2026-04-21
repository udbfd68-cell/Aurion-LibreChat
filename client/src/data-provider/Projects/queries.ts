import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type {
  UseQueryOptions,
  UseMutationOptions,
  QueryObserverResult,
} from '@tanstack/react-query';
import type {
  TProject,
  CreateProjectPayload,
  UpdateProjectPayload,
} from 'librechat-data-provider';

export const useProjectsQuery = (
  config?: UseQueryOptions<TProject[]>,
): QueryObserverResult<TProject[]> => {
  return useQuery<TProject[]>([QueryKeys.projects], () => dataService.getProjects(), {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...config,
  });
};

export const useCreateProjectMutation = (
  options?: UseMutationOptions<TProject, Error, CreateProjectPayload>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TProject, Error, CreateProjectPayload>(
    [MutationKeys.createProject],
    (data: CreateProjectPayload) => dataService.createProject(data),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.projects]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export type UpdateProjectMutationParams = {
  projectId: string;
  data: UpdateProjectPayload;
};

export const useUpdateProjectMutation = (
  options?: UseMutationOptions<TProject, Error, UpdateProjectMutationParams>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TProject, Error, UpdateProjectMutationParams>(
    [MutationKeys.updateProject],
    ({ projectId, data }: UpdateProjectMutationParams) =>
      dataService.updateProject(projectId, data),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.projects]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export const useDeleteProjectMutation = (
  options?: UseMutationOptions<{ message: string }, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, string>(
    [MutationKeys.deleteProject],
    (projectId: string) => dataService.deleteProject(projectId),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.projects]);
        options?.onSuccess?.(...params);
      },
    },
  );
};
