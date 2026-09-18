import { Router } from 'express';
import * as slotsController from '../controllers/slots.controller.js';

// PUBLIC — see docs/API_SPEC.md §4.
export const slotsRouter = Router();

slotsRouter.get('/', slotsController.getAvailability);
