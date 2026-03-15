const cloudinary = require('cloudinary').v2;

console.log('Cloudinary Config Check:', {
    hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
    hasApiKey: !!process.env.CLOUDINARY_API_KEY,
    hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const uploadToCloudinary = async (filePath, folder = 'inventory_panel_profiles') => {
    try {
        // --- Local Compression with Sharp ---
        // Create a temporary compressed file path
        const compressedPath = filePath + '_compressed.jpg';
        
        await sharp(filePath)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }) // Limit dimensions
            .jpeg({ quality: 80 }) // Compress quality
            .toFile(compressedPath);

        // Upload the COMPRESSED file to Cloudinary
        const result = await cloudinary.uploader.upload(compressedPath, {
            folder: folder,
            resource_type: "auto"
        });

        // Cleanup: remove BOTH temporary files
        if (fs.existsSync(compressedPath)) fs.unlinkSync(compressedPath);
        // The original file will be cleaned up by the caller (orderController), 
        // but let's be safe if it's not the same.

        return result;
    } catch (error) {
        console.error('Cloudinary/Sharp Upload Error:', error);
        throw new Error(`Image compression/upload failed: ${error.message}`);
    }
};

module.exports = { cloudinary, uploadToCloudinary };
