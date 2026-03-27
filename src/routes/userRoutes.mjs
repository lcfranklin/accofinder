import express from 'express';
import * as userController from '../controllers/userController.mjs';
import { authenticateJWT } from '../middleware/authMiddleware.mjs';
import { checkRole } from '../middleware/roleMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import { updateProfileSchema } from '../validators/validators.mjs';

const userRoutes = express.Router();

userRoutes.get('/', authenticateJWT, userController.getUsers);

userRoutes.get('/:id', authenticateJWT, checkRole(['admin']), userController.getUserById);

userRoutes.get('/me/profile', authenticateJWT,userController.getMyProfile)
// Update user profile (self)
userRoutes.patch('/me/profile', authenticateJWT, checkRole(['landlord', 'client', 'student', 'admin']), validateRequest(updateProfileSchema), userController.updateMyProfile);

// Delete a user (admin only)
userRoutes.delete('/:id', authenticateJWT,checkRole(['admin']), userController.deleteUser);

// Promote a user (admin only)
userRoutes.patch('/:id/promote', authenticateJWT, checkRole(['admin']), userController.promoteUser);

export default userRoutes;
