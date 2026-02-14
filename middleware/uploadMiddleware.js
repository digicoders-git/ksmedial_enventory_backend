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
    limits: { fileSize: 5000000 }, // 5MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname) { // Rely mainly on extension as mimetype can vary for docs
        return cb(null, true);
    } else {
        cb('Error: Images and Documents Only!');
    }
}

module.exports = upload;
