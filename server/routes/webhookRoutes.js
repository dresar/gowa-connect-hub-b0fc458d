import { Router } from 'express';
import {
  getWebhookSettings,
  updateWebhookSettings,
  getWebhookLogs,
  handleWebhook,
} from '../controllers/webhookController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { requireJsonBody } from '../middlewares/validate.js';

export const webhookRouter = Router();

webhookRouter.get('/settings', getWebhookSettings);
webhookRouter.post(
  '/settings',
  authMiddleware,
  requireJsonBody,
  updateWebhookSettings
);
webhookRouter.get('/logs', getWebhookLogs);
webhookRouter.post('/', handleWebhook);
