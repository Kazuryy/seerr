import { DeletionRequestStatus, MediaType } from '@app/utils/deletionConstants';
import type {
  CreateDeletionRequestBody,
  DeletionRequestResult,
  VoteOnDeletionBody,
} from '@server/interfaces/api/deletionInterfaces';
import axios from 'axios';
import type { KeyedMutator } from 'swr';
import useSWR from 'swr';

export { DeletionRequestStatus, MediaType };
// Re-export types for convenience
export type { CreateDeletionRequestBody, DeletionRequestResult };

interface DeletionRequestsResponse {
  pageInfo: {
    pages: number;
    pageSize: number;
    results: number;
    page: number;
  };
  results: DeletionRequestResult[];
}

interface UseDeletionRequestsOptions {
  page?: number;
  pageSize?: number;
  status?: DeletionRequestStatus;
}

interface UseDeletionRequestsResponse {
  data?: DeletionRequestsResponse;
  error: unknown;
  isLoading: boolean;
  mutate: KeyedMutator<DeletionRequestsResponse>;
}

interface UseDeletionRequestResponse {
  data?: DeletionRequestResult;
  error: unknown;
  isLoading: boolean;
  mutate: KeyedMutator<DeletionRequestResult>;
}

interface UserVote {
  id: number;
  deletionRequestId: number;
  vote: boolean;
  createdAt: Date;
}

interface UseUserVoteResponse {
  vote?: UserVote | null;
  error: unknown;
  isLoading: boolean;
  mutate: KeyedMutator<UserVote | null>;
}

/**
 * Hook to fetch paginated deletion requests
 */
export const useDeletionRequests = (
  options: UseDeletionRequestsOptions = {}
): UseDeletionRequestsResponse => {
  const { page = 1, pageSize = 20, status } = options;

  const params = new URLSearchParams({
    take: pageSize.toString(),
    skip: ((page - 1) * pageSize).toString(),
  });

  if (status) {
    params.append('status', status);
  }

  const { data, error, mutate } = useSWR<DeletionRequestsResponse>(
    `/api/v1/deletion?${params.toString()}`,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    data,
    error,
    isLoading: !data && !error,
    mutate,
  };
};

/**
 * Hook to fetch a single deletion request by ID
 */
export const useDeletionRequest = (
  id: number | undefined
): UseDeletionRequestResponse => {
  const { data, error, mutate } = useSWR<DeletionRequestResult>(
    id ? `/api/v1/deletion/${id}` : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    data,
    error,
    isLoading: !data && !error,
    mutate,
  };
};

/**
 * Hook to fetch current user's vote on a deletion request
 */
export const useUserVote = (
  deletionRequestId: number | undefined
): UseUserVoteResponse => {
  const { data, error, mutate } = useSWR<UserVote | null>(
    deletionRequestId ? `/api/v1/deletion/${deletionRequestId}/vote/me` : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    vote: data,
    error,
    isLoading: !data && !error,
    mutate,
  };
};

/**
 * Create a new deletion request
 */
export const createDeletionRequest = async (
  body: CreateDeletionRequestBody
): Promise<DeletionRequestResult> => {
  const response = await axios.post<DeletionRequestResult>(
    '/api/v1/deletion',
    body
  );
  return response.data;
};

/**
 * Vote on a deletion request
 */
export const voteOnDeletion = async (
  deletionRequestId: number,
  vote: boolean
): Promise<void> => {
  const body: VoteOnDeletionBody = { vote };
  await axios.post(`/api/v1/deletion/${deletionRequestId}/vote`, body);
};

/**
 * Remove user's vote from a deletion request
 */
export const removeVote = async (deletionRequestId: number): Promise<void> => {
  await axios.delete(`/api/v1/deletion/${deletionRequestId}/vote`);
};

/**
 * Execute media deletion (admin only)
 */
export const executeMediaDeletion = async (
  deletionRequestId: number
): Promise<DeletionRequestResult> => {
  const response = await axios.post<DeletionRequestResult>(
    `/api/v1/deletion/${deletionRequestId}/execute`
  );
  return response.data;
};

/**
 * Cancel a deletion request
 */
export const cancelDeletionRequest = async (
  deletionRequestId: number
): Promise<DeletionRequestResult> => {
  const response = await axios.post<DeletionRequestResult>(
    `/api/v1/deletion/${deletionRequestId}/cancel`
  );
  return response.data;
};
