import { PrismaClient } from '@prisma/client';

export interface IAchievementRepository {
  findMany(params?: any): Promise<any[]>;
  findById(id: number): Promise<any | null>;
  findBySlug(slug: string): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: number, data: any): Promise<any>;
  delete(id: number): Promise<void>;
  findUserAchievements(userId: number): Promise<any[]>;
  findUserAchievementsByAchievementId(achievementId: number, params?: any): Promise<any[]>;
  createUserAchievement(data: any): Promise<any>;
  updateUserAchievement(params: any): Promise<any>;
}

export class AchievementRepository implements IAchievementRepository {
  constructor(private prisma: PrismaClient) {}

  async findMany(params?: any) {
    return this.prisma.achievement.findMany(params);
  }

  async findById(id: number) {
    return this.prisma.achievement.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.achievement.findUnique({
      where: { slug },
    });
  }

  async create(data: any) {
    return this.prisma.achievement.create({
      data,
    });
  }

  async update(id: number, data: any) {
    return this.prisma.achievement.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    await this.prisma.achievement.delete({
      where: { id },
    });
  }

  async findUserAchievements(userId: number) {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
    });
  }

  async findUserAchievementsByAchievementId(achievementId: number, params?: any) {
    return this.prisma.userAchievement.findMany({
      where: { achievementId },
      ...params,
    });
  }

  async createUserAchievement(data: any) {
    return this.prisma.userAchievement.create({
      data,
    });
  }

  async updateUserAchievement(params: any) {
    return this.prisma.userAchievement.upsert(params);
  }
}
