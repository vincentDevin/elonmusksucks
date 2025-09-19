import { PostReaction, ReactionType } from '@prisma/client';

export interface IReactionRepository {
  addReaction(postId: number, userId: number, type: ReactionType): Promise<PostReaction>;
  removeReaction(postId: number, userId: number, type: ReactionType): Promise<boolean>;
  getUserReaction(postId: number, userId: number): Promise<PostReaction | null>;
  getPostReactions(postId: number): Promise<PostReaction[]>;
  getReactionCounts(postId: number): Promise<Record<ReactionType, number>>;
  updatePostReactionCount(postId: number): Promise<void>;
  getPostReactionsPaginated(
    postId: number,
    options: {
      cursor?: number;
      limit?: number;
      type?: ReactionType;
    },
  ): Promise<{ reactions: PostReaction[]; nextCursor?: number }>;
  toggleReaction(
    postId: number,
    userId: number,
    type: ReactionType,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction?: PostReaction;
    previousType?: ReactionType;
  }>;
}
