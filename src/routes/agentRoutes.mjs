import express from 'express';
import * as agentController from '../controllers/agentController.mjs';
import * as agentApplicationController from '../controllers/agentApplicationController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';

const agentRoutes = express.Router();

agentRoutes.get('/', isAuthenticated, checkRole(['ADMIN']), agentController.getAgents);

agentRoutes.patch(
  '/commission',
  isAuthenticated,
  checkRole(['ADMIN']),
  agentController.setAllAgentsCommission,
);

agentRoutes.get('/:agentId', isAuthenticated, checkRole(['ADMIN']), agentController.getAgentById);

agentRoutes.patch(
  '/:id',
  isAuthenticated,
  checkRole(['ADMIN']),
  agentController.updateAgent,
);

agentRoutes.patch(
  '/:id/status',
  isAuthenticated,
  checkRole(['ADMIN']),
  agentController.setAgentActive,
);

const agentApplicationRoutes = express.Router();

agentApplicationRoutes.post(
  '/',
  isAuthenticated,
  checkRole(['CLIENT', 'ADMIN']),
  agentApplicationController.createAgentApplication,
);

agentApplicationRoutes.get(
  '/',
  isAuthenticated,
  checkRole(['ADMIN']),
  agentApplicationController.getAgentApplications,
);

agentApplicationRoutes.patch(
  '/:id/approve',
  isAuthenticated,
  checkRole(['ADMIN']),
  agentApplicationController.approveAgentApplication,
);

agentApplicationRoutes.patch(
  '/:id/reject',
  isAuthenticated,
  checkRole(['ADMIN']),
  agentApplicationController.rejectAgentApplication,
);

agentApplicationRoutes.patch(
  '/:id/notes',
  isAuthenticated,
  checkRole(['ADMIN']),
  agentApplicationController.updateAgentApplicationNotes,
);

export default agentRoutes;
export { agentApplicationRoutes };