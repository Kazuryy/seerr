/**
 * Frontend constants for deletion requests
 * These mirror the server enums but are defined separately to avoid
 * importing server code into the frontend bundle
 */

export enum DeletionRequestStatus {
  PENDING = 'pending',
  VOTING = 'voting',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum MediaType {
  MOVIE = 'movie',
  TV = 'tv',
}
