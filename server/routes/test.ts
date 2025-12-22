import logger from '@server/logger';
import { Router } from 'express';

const testRoutes = Router();

// Route de test ultra-simple - copie exacte du pattern discover
testRoutes.get('/hello', (req, res) => {
  logger.info('✅ TEST ROUTE /hello HIT!', { label: 'Test Route' });
  return res.status(200).json({
    success: true,
    message: 'Test route works!',
    timestamp: new Date().toISOString(),
  });
});

export default testRoutes;
