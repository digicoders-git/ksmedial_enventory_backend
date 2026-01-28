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

const uploadToCloudinary = async (filePath) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'inventory_panel_profiles',
            width: 300,
            crop: "scale"
        });
        return result;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        throw new Error(`Image upload failed: ${error.message}`);
    }
};

module.exports = { cloudinary, uploadToCloudinary };
