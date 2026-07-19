const multer = require('multer');
const path = require('path');

// Use memory storage so we can process file buffers in memory and check duplicates before writing anything to disk.
const storage = multer.memoryStorage();

// Supported MIME types and file extensions
const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/tiff',
  'image/bmp',
  'image/webp'
];

const fileFilter = (req, file, cb) => {
  const fileMime = file.mimetype.toLowerCase();
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  const isAllowedMime = ALLOWED_MIMES.includes(fileMime);
  const isAllowedExt = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.webp'].includes(fileExt);

  if (isAllowedMime || isAllowedExt) {
    cb(null, true);
  } else {
    cb(new Error(`File type not supported. Allowed formats: PDF, DOCX, TXT, and common images (PNG/JPG).`), false);
  }
};

const getMaxSize = () => {
  const sizeMb = parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10);
  return sizeMb * 1024 * 1024;
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: getMaxSize(),
  },
});

module.exports = upload;
