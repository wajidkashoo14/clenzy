import { Router } from 'express';
import * as notificationsController from '../controllers/notifications.controller.js';
import { requireAuth } from '../middlewares/auth.js';

/** See docs/API_SPEC.md §9 "Notifications & content". */
export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get('/', notificationsController.list);
notificationsRouter.get('/unread-count', notificationsController.unreadCount);
notificationsRouter.patch('/read-all', notificationsController.markAllRead);
notificationsRouter.patch('/preferences', notificationsController.updatePreferences);
notificationsRouter.patch('/:id/read', notificationsController.markRead);
