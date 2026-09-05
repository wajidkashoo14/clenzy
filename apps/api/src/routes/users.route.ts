import { Router } from 'express';
import * as usersController from '../controllers/users.controller.js';
import { requireAuth } from '../middlewares/auth.js';

/** See docs/API_SPEC.md §2 "Users & addresses — /users". Email verification and account deletion aren't built yet. */
export const usersRouter = Router();

usersRouter.use(requireAuth);
usersRouter.get('/me', usersController.getMe);
usersRouter.patch('/me', usersController.updateMe);
