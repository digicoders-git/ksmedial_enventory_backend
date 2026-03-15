const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set general storage engine (Cloudinary fallback / other uploads)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(process.cwd(), 'uploads');
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Specific storage for Product/Inventory images (Local Folder: inventry_image)
const productStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(process.cwd(), 'inventry_image');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // As requested: Use the original name of the file
        cb(null, file.originalname);
    }
});

// Init general upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        cb(null, true);
    }
});

// Init product specific upload
const productUpload = multer({
    storage: productStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        cb(null, true);
    }
});

module.exports = { upload, productUpload };
