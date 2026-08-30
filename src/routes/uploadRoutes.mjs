import express from 'express';
import multer from 'multer';
import { isAuthenticated } from '../middleware/authMiddleware.mjs';
import {
  uploadMedia,
  getUploadUrl,
  getMediaByProperty,
  deleteMedia,
  updateMedia,
} from '../controllers/uploadController.mjs';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|webp|gif/;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.post('/upload', isAuthenticated, upload.single('file'), uploadMedia);

router.get('/presigned-url', isAuthenticated, getUploadUrl);

router.get('/property/:propertyId', getMediaByProperty);
router.delete('/:id', isAuthenticated, deleteMedia);
router.patch('/:id', isAuthenticated, updateMedia);

export default router;