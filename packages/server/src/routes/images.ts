// packages/server/src/routes/images.ts
import { Router } from 'express';
import { getCuratedImages, getImageById } from '../services/images.js';

const router = Router();

router.get('/', async (_req, res) => {
  const images = await getCuratedImages();
  res.json(images);
});

router.get('/:id', async (req, res) => {
  const image = await getImageById(req.params.id);
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }
  res.json(image);
});

export const imagesRouter: Router = router;
