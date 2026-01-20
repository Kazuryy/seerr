import Alert from '@app/components/Common/Alert';
import UserBadgeDisplay from '@app/components/Badges/UserBadgeDisplay';
import Button from '@app/components/Common/Button';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import {
  createReviewComment,
  deleteReviewComment,
  useReviewComments,
  type ReviewComment,
} from '@app/hooks/useCommunity';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Community.ReviewComments', {
  writeComment: 'Write a comment...',
  writeReply: 'Write a reply...',
  post: 'Post',
  cancel: 'Cancel',
  reply: 'Reply',
  delete: 'Delete',
  noComments: 'No comments yet',
  beFirst: 'Be the first to comment!',
});

interface CommentItemProps {
  comment: ReviewComment;
  reviewId: number;
  onReply?: (parentCommentId: number) => void;
  onDelete: () => void;
  isReply?: boolean;
}

const CommentItem = ({
  comment,
  reviewId,
  onReply,
  onDelete,
  isReply = false,
}: CommentItemProps) => {
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setIsDeleting(true);
    try {
      await deleteReviewComment(reviewId, comment.id);
      onDelete();
    } catch (error) {
      // Silent error - user will see comment still there
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwnComment = user?.id === comment.user.id;

  return (
    <div className={`${isReply ? 'ml-12' : ''}`}>
      <div className="flex space-x-3">
        <Link href={`/users/${comment.user.id}`} className="flex-shrink-0">
          <img
            src={comment.user.avatar || '/avatars/default.png'}
            alt={comment.user.displayName}
            className="h-8 w-8 rounded-full"
          />
        </Link>

        <div className="flex-1">
          <div className="rounded-lg bg-gray-700 px-4 py-2">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Link
                  href={`/users/${comment.user.id}`}
                  className="text-sm font-semibold text-white hover:text-indigo-400"
                >
                  {comment.user.displayName}
                </Link>
                <UserBadgeDisplay userId={comment.user.id} limit={2} size="sm" />
              </div>
              {isOwnComment && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-gray-400 hover:text-red-400"
                  title="Delete comment"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-300">
              {comment.content}
            </p>
          </div>

          <div className="mt-1 flex items-center space-x-4 text-xs text-gray-400">
            <span>{new Date(comment.createdAt).toLocaleString()}</span>
            {!isReply && onReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="hover:text-indigo-400"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              reviewId={reviewId}
              onDelete={onDelete}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ReviewCommentsProps {
  reviewId: number;
}

const ReviewComments = ({ reviewId }: ReviewCommentsProps) => {
  const intl = useIntl();
  const { user } = useUser();
  const { data, isLoading, error, mutate } = useReviewComments(reviewId);
  const [commentContent, setCommentContent] = useState('');
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentContent.trim()) return;

    setIsPosting(true);
    try {
      await createReviewComment(
        reviewId,
        commentContent,
        replyToId ?? undefined
      );
      setCommentContent('');
      setReplyToId(null);
      mutate();
    } catch (error) {
      // Silent error - form will stay filled
    } finally {
      setIsPosting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Alert title="Error" type="error">
        Failed to load comments
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comments List */}
      {data && data.comments.length > 0 ? (
        <div className="space-y-4">
          {data.comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              reviewId={reviewId}
              onReply={setReplyToId}
              onDelete={mutate}
            />
          ))}
        </div>
      ) : (
        <div className="py-4 text-center text-gray-400">
          <p>{intl.formatMessage(messages.noComments)}</p>
          <p className="text-sm">{intl.formatMessage(messages.beFirst)}</p>
        </div>
      )}

      {/* Comment Form */}
      {user && (
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <img
            src={user.avatar || '/avatars/default.png'}
            alt={user.displayName}
            className="h-8 w-8 flex-shrink-0 rounded-full"
          />
          <div className="flex-1">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder={intl.formatMessage(
                replyToId ? messages.writeReply : messages.writeComment
              )}
              rows={2}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-end space-x-2">
              {replyToId && (
                <Button
                  buttonType="default"
                  onClick={() => {
                    setReplyToId(null);
                    setCommentContent('');
                  }}
                  disabled={isPosting}
                >
                  {intl.formatMessage(messages.cancel)}
                </Button>
              )}
              <Button
                buttonType="primary"
                type="submit"
                disabled={isPosting || !commentContent.trim()}
              >
                {intl.formatMessage(messages.post)}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default ReviewComments;
