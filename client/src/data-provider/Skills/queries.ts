import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type {
  UseQueryOptions,
  UseMutationOptions,
  QueryObserverResult,
} from '@tanstack/react-query';
import type {
  TSkill,
  CreateSkillPayload,
  UpdateSkillPayload,
} from 'librechat-data-provider';

export const useSkillsQuery = (
  category?: string,
  config?: UseQueryOptions<TSkill[]>,
): QueryObserverResult<TSkill[]> => {
  return useQuery<TSkill[]>(
    [QueryKeys.skills, category],
    () => dataService.getSkills(category),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};

export const useCreateSkillMutation = (
  options?: UseMutationOptions<TSkill, Error, CreateSkillPayload>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TSkill, Error, CreateSkillPayload>(
    [MutationKeys.createSkill],
    (data: CreateSkillPayload) => dataService.createSkill(data),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.skills]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export type UpdateSkillMutationParams = {
  skillId: string;
  data: UpdateSkillPayload;
};

export const useUpdateSkillMutation = (
  options?: UseMutationOptions<TSkill, Error, UpdateSkillMutationParams>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TSkill, Error, UpdateSkillMutationParams>(
    [MutationKeys.updateSkill],
    ({ skillId, data }: UpdateSkillMutationParams) => dataService.updateSkill(skillId, data),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.skills]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export const useDeleteSkillMutation = (
  options?: UseMutationOptions<{ message: string }, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, string>(
    [MutationKeys.deleteSkill],
    (skillId: string) => dataService.deleteSkill(skillId),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.skills]);
        options?.onSuccess?.(...params);
      },
    },
  );
};
