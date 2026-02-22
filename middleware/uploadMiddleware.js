const multer = require('multer');
const path = require('path');

const fs = require('fs');

// Set storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(process.cwd(), 'uploads');
        console.log('Multer Destination (Safe):', uploadPath);
        
        if (!fs.existsSync(uploadPath)) {
            console.log('Creating directory:', uploadPath);
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        console.log('Multer Filename for:', file.originalname);
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: function (req, file, cb) {
        cb(null, true); // Allow all file types
    }
});

// Check file type
function checkFileType(file, cb) {
    // Expanded to allow all common image formats + documents
    const filetypes = /jpeg|jpg|png|gif|webp|svg|avif|bmp|tiff|pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    // Check if it's an image mimetype
    const isImageMime = file.mimetype.startsWith('image/');
    const isDocMime = /pdf|msword|officedocument/.test(file.mimetype);

    if (extname || isImageMime || isDocMime) {
        return cb(null, true);
    } else {
        cb('Error: Invalid file format! Only images and documents are allowed.');
    }
}

module.exports = upload;
