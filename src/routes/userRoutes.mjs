import express from 'express';
import * as userController from '../controllers/userController.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import { userValidationRules, validate } from '../validaters/userValidator.mjs';

const router = express.Router();

router.get('/', protect, userController.getUsers);

router.post('/', userValidationRules(), validate, userController.createUser);

export default router;
