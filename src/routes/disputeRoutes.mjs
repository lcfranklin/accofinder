import express from 'express';
import * as disputeController from '../controllers/disputeController.mjs';

const router = express.Router();

router.get('/', disputeController.getDisputes);
router.post('/', disputeController.createDispute);

export default router;
