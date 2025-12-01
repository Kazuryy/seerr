import type { MediaType } from '@server/constants/media';
import type { DeletionRequest } from '@server/entity/DeletionRequest';
import type { User } from '@server/entity/User';
import type { NonFunctionProperties, PaginatedResponse } from './common';

export { DeletionRequestStatus } from '@server/entity/DeletionRequest';

/**
 * Request body for creating a new deletion request
 */
export interface CreateDeletionRequestBody {
  mediaId: number;
  mediaType: MediaType;
  reason?: string;
}

/**
 * Request body for voting on a deletion request
 */
export interface VoteOnDeletionBody {
  /** true = vote FOR deletion, false = vote AGAINST deletion */
  vote: boolean;
}

/**
 * Response for paginated deletion request results
 */
export interface DeletionRequestResultsResponse extends PaginatedResponse {
  results: DeletionRequestResult[];
}

/**
 * Full deletion request result including computed properties
 */
export interface DeletionRequestResult
  extends NonFunctionProperties<DeletionRequest> {
  requestedBy: User;
  processedBy?: User | null;
  isVotingActive: boolean;
  votePercentage: number;
  totalVotes: number;
}
