import express from 'express';
import * as userController from '../controllers/userController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import { updateProfileSchema } from '../validators/updateProfileSchema.mjs';

const userRoutes = express.Router();

userRoutes.get('/', isAuthenticated, userController.getUsers);

userRoutes.get('/:id', isAuthenticated, checkRole(['admin']), userController.getUserById);

userRoutes.get('/me/profile', isAuthenticated,userController.getMyProfile)
// Update user profile (self)
userRoutes.patch('/me/profile', isAuthenticated, checkRole(['landlord', 'client', 'student', 'admin']), validateRequest(updateProfileSchema), userController.updateMyProfile);

// Delete a user (admin only)
userRoutes.delete('/:id', isAuthenticated,checkRole(['admin']), userController.deleteUser);

// Promote a user (admin only)
userRoutes.patch('/:id/promote', isAuthenticated, checkRole(['admin']), userController.promoteUser);

export default userRoutes;
