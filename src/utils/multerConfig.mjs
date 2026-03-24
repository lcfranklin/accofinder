import multer from 'multer';
import path from 'path';
import fs from "fs";

// Define storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.user._id.toString();
    const dir = `./uploads/${userId}`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname); 
    const type = file.fieldname; 
    const filename = `${type}${ext}`;
    cb(null, filename);
  }
});


const checkFileType = (file, cb) => {
  const filetypes = /jpg|jpeg|png|webp/;
  const extname = filetypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('forbidden file forma: only images  are allowed!'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

export default upload;
