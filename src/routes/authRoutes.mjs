import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import { registerUserSchema } from '../validators/validators.mjs';

const router = express.Router();

router.post('/register', validateRequest(registerUserSchema), registerUser);
router.post('/login', loginUser);

export default router;
