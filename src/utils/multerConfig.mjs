import multer from 'multer';
import path from 'path';

// Define storage for uploaded files
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // Files will be stored in an 'uploads' directory at the root
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

// Create file filter to restrict uploads to images
const checkFileType = (file, cb) => {
  const filetypes = /jpg|jpeg|png|webp/;
  const extname = filetypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Images only!'));
  }
};

// Configured multer instance ready for use in routes
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

export default upload;
