import { Router } from 'express';
import {
  getAllPredictions,
  getPredictionById,
  createPrediction,
} from '../controllers/predictions.controller';
import { requireAuth, type AuthRequest } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Public routes
router.get('/', getAllPredictions);
router.get('/:id', getPredictionById);

// Authenticated routes
router.post('/', requireAuth, createPrediction);

// POST /api/predictions/source-links - Link article to prediction
router.post('/source-links', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const { predictionId, articleId, tweetId, url, title, publisher } = req.body;
    // const userId = req.user!.id; // Not currently used, but available for future permissions

    // Validate required fields
    if (!predictionId || !url) {
      res.status(400).json({ error: 'Prediction ID and URL are required' });
      return;
    }

    if (!articleId && !tweetId) {
      res.status(400).json({ error: 'Either article ID or tweet ID is required' });
      return;
    }

    // Check if prediction exists and user has permission to link sources
    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
      select: { id: true, creatorId: true, resolved: true },
    });

    if (!prediction) {
      res.status(404).json({ error: 'Prediction not found' });
      return;
    }

    if (prediction.resolved) {
      res.status(400).json({ error: 'Cannot link sources to resolved predictions' });
      return;
    }

    // For now, allow any authenticated user to link sources
    // Later we might restrict to prediction creator or admins

    // Check if this link already exists
    const existingLink = await prisma.predictionSourceLink.findFirst({
      where: {
        predictionId,
        ...(articleId ? { articleId } : { tweetId }),
      },
    });

    if (existingLink) {
      res.status(409).json({ error: 'This source is already linked to this prediction' });
      return;
    }

    // Create the source link
    const sourceLink = await prisma.predictionSourceLink.create({
      data: {
        predictionId,
        articleId: articleId || null,
        tweetId: tweetId || null,
        url,
        title: title || null,
        publisher: publisher || null,
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            url: true,
            feed: {
              select: {
                name: true,
                siteUrl: true,
              },
            },
          },
        },
        tweet: {
          select: {
            id: true,
            text: true,
            permalink: true,
            authorHandle: true,
          },
        },
      },
    });

    res.status(201).json({
      id: sourceLink.id,
      predictionId: sourceLink.predictionId,
      articleId: sourceLink.articleId,
      tweetId: sourceLink.tweetId,
      url: sourceLink.url,
      title: sourceLink.title,
      publisher: sourceLink.publisher,
      capturedAt: sourceLink.capturedAt.toISOString(),
      source: sourceLink.article || sourceLink.tweet || null,
    });
  } catch (error) {
    console.error('[predictions] Error creating source link:', error);
    res.status(500).json({ error: 'Failed to create source link' });
  }
});

// GET /api/predictions/:id/source-links - Get source links for a prediction
router.get('/:id/source-links', async (req: any, res: any) => {
  try {
    const predictionId = parseInt(req.params.id);

    if (isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    const sourceLinks = await prisma.predictionSourceLink.findMany({
      where: { predictionId },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            url: true,
            leadImageUrl: true,
            feed: {
              select: {
                name: true,
                siteUrl: true,
              },
            },
          },
        },
        tweet: {
          select: {
            id: true,
            text: true,
            permalink: true,
            authorHandle: true,
          },
        },
      },
      orderBy: { capturedAt: 'desc' },
    });

    const formattedLinks = sourceLinks.map((link) => ({
      id: link.id,
      predictionId: link.predictionId,
      url: link.url,
      title: link.title,
      publisher: link.publisher,
      capturedAt: link.capturedAt.toISOString(),
      type: link.articleId ? 'article' : 'tweet',
      source: link.article || link.tweet || null,
    }));

    res.json(formattedLinks);
  } catch (error) {
    console.error('[predictions] Error fetching source links:', error);
    res.status(500).json({ error: 'Failed to fetch source links' });
  }
});

export default router;
