import { Server as SocketIOServer } from 'socket.io';
import { ReactionRepository, IReactionRepository } from '../repositories/ReactionRepository';
import { PostRepository } from '../repositories/PostRepository';
import prisma from '../db';
import type { PostReaction, ReactionType } from '@ems/types';
import { NotFoundError, ValidationError } from '../errors';

export class ReactionService {
  private reactionRepository: IReactionRepository;
  private postRepository: PostRepository;
  private io?: SocketIOServer;

  constructor(io?: SocketIOServer) {
    this.reactionRepository = new ReactionRepository(prisma);
    this.postRepository = new PostRepository(prisma);
    this.io = io;
  }

  /**
   * Add or update a reaction to a post
   */
  async addReaction(
    postId: number,
    userId: number,
    type: ReactionType,
  ): Promise<{
    reaction: PostReaction;
    counts: Record<ReactionType, number>;
    action: 'added' | 'changed';
  }> {
    // Validate post exists and user can see it
    const post = await this.postRepository.getPost(postId, userId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Validate reaction type
    if (!this.isValidReactionType(type)) {
      throw new ValidationError('Invalid reaction type');
    }

    // Check for existing reaction
    const existingReaction = await this.reactionRepository.getUserReaction(postId, userId);

    let action: 'added' | 'changed';
    if (existingReaction) {
      if (existingReaction.type === type) {
        throw new ValidationError('You have already reacted with this type');
      }
      // Remove old reaction first
      await this.reactionRepository.removeReaction(postId, userId, existingReaction.type);
      action = 'changed';
    } else {
      action = 'added';
    }

    // Add new reaction
    const reaction = await this.reactionRepository.addReaction(postId, userId, type);

    // Get updated counts
    const counts = await this.reactionRepository.getReactionCounts(postId);

    // Emit real-time event
    if (this.io) {
      this.io.emit('post:reaction', {
        postId,
        userId,
        type,
        action,
        counts,
        userName: (reaction as any)?.user?.name,
        userAvatar: (reaction as any)?.user?.avatarUrl,
      });
    }

    return {
      reaction: this.toReactionDTO(reaction),
      counts,
      action,
    };
  }

  /**
   * Remove a reaction from a post
   */
  async removeReaction(
    postId: number,
    userId: number,
    type: ReactionType,
  ): Promise<{
    success: boolean;
    counts: Record<ReactionType, number>;
  }> {
    // Validate post exists
    const post = await this.postRepository.getPost(postId, userId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Remove reaction
    const success = await this.reactionRepository.removeReaction(postId, userId, type);

    // Get updated counts
    const counts = await this.reactionRepository.getReactionCounts(postId);

    // Emit real-time event
    if (this.io && success) {
      this.io.emit('post:reaction', {
        postId,
        userId,
        type,
        action: 'removed',
        counts,
      });
    }

    return { success, counts };
  }

  /**
   * Toggle a reaction (smart add/remove/change)
   */
  async toggleReaction(
    postId: number,
    userId: number,
    type: ReactionType,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction?: PostReaction;
    counts: Record<ReactionType, number>;
  }> {
    // Validate post exists and user can see it
    const post = await this.postRepository.getPost(postId, userId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Validate reaction type
    if (!this.isValidReactionType(type)) {
      throw new ValidationError('Invalid reaction type');
    }

    // Toggle reaction
    const result = await this.reactionRepository.toggleReaction(postId, userId, type);

    // Get updated counts
    const counts = await this.reactionRepository.getReactionCounts(postId);

    // Emit real-time event
    if (this.io) {
      this.io.emit('post:reaction', {
        postId,
        userId,
        type,
        action: result.action,
        counts,
        previousType: result.previousType,
        userName: (result.reaction as any)?.user?.name,
        userAvatar: (result.reaction as any)?.user?.avatarUrl,
      });
    }

    return {
      action: result.action,
      reaction: result.reaction ? this.toReactionDTO(result.reaction) : undefined,
      counts,
    };
  }

  /**
   * Get all reactions for a post
   */
  async getPostReactions(
    postId: number,
    userId?: number,
    options: {
      cursor?: number;
      limit?: number;
      type?: ReactionType;
    } = {},
  ): Promise<{
    reactions: PostReaction[];
    counts: Record<ReactionType, number>;
    userReaction?: ReactionType;
    nextCursor?: number;
  }> {
    // Validate post exists and user can see it
    const post = await this.postRepository.getPost(postId, userId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Get paginated reactions
    const { reactions, nextCursor } = await this.reactionRepository.getPostReactionsPaginated(
      postId,
      options,
    );

    // Get reaction counts
    const counts = await this.reactionRepository.getReactionCounts(postId);

    // Get user's reaction if authenticated
    let userReaction: ReactionType | undefined;
    if (userId) {
      const reaction = await this.reactionRepository.getUserReaction(postId, userId);
      userReaction = reaction?.type;
    }

    return {
      reactions: reactions.map((r: any) => this.toReactionDTO(r)),
      counts,
      userReaction,
      nextCursor,
    };
  }

  /**
   * Get reaction summary for a post (counts only)
   */
  async getReactionCounts(postId: number): Promise<Record<ReactionType, number>> {
    return await this.reactionRepository.getReactionCounts(postId);
  }

  /**
   * Get user's reaction to a post
   */
  async getUserReaction(postId: number, userId: number): Promise<ReactionType | null> {
    const reaction = await this.reactionRepository.getUserReaction(postId, userId);
    return reaction?.type ?? null;
  }

  /**
   * Validate reaction type
   */
  private isValidReactionType(type: string): type is ReactionType {
    const validTypes = ['LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD', 'ANGRY'];
    return validTypes.includes(type);
  }

  /**
   * Convert database reaction to API format
   */
  private toReactionDTO(reaction: any): PostReaction {
    return {
      id: reaction.id,
      postId: reaction.postId,
      userId: reaction.userId,
      type: reaction.type,
      createdAt: reaction.createdAt.toISOString(),
      userName: reaction.user?.name || null,
      userAvatar: reaction.user?.avatarUrl || null,
    };
  }
}
