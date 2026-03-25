import express from 'express';
import * as userController from '../controllers/userController.mjs';
import { authenticateJWT } from '../middleware/authMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import {registerUserSchemaValidator} from '../validators/validators.mjs'

const userRoutes = express.Router();

userRoutes.get('/', authenticateJWT, userController.getUsers);

userRoutes.post('/', validateRequest(registerUserSchemaValidator), userController.createUser);

export default userRoutes;
