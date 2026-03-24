import express from 'express';
import * as userController from '../controllers/userController.mjs';
import { authenticateJWT } from '../middleware/authMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import {registerUserSchema} from '../validators/userValidator.mjs'

const userRoutes = express.Router();

userRoutes.get('/', authenticateJWT, userController.getUsers);

userRoutes.post('/', validateRequest(registerUserSchema), userController.createUser);

export default userRoutes;
