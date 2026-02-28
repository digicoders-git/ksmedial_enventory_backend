const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protectAdmin } = require('../middleware/authMiddleware');
const { 
    adminLogin, 
    createAdmin,
    getAdminStats, 
    getOrders, 
    createAdminOrder,
    updateOrderStatus, 
    getAdminProducts, 
    createAdminProduct,
    updateAdminProduct,
    deleteAdminProduct,
    bulkUploadAdminProduct,
    downloadSampleCSV,
    getShops,
    createShop,
    updateShop,
    deleteShop,
    getAllCategories,
    createAdminCategory,
    updateAdminCategory,
    deleteAdminCategory,
    listOffers,
    createOffer,
    updateOffer,
    deleteOffer,
    listSliders, // Added
    createSlider, // Added
    updateSlider, // Added
    deleteSlider, // Added
    getAllBlogs, // Added
    createBlog, // Added
    updateBlog, // Added
    deleteBlog, // Added
    likeBlog, // Added
    listEnquiries, // Added
    createEnquiry, // Added
    updateEnquiry, // Added
    deleteEnquiry, // Added
    changeAdminPassword // Added
} = require('../controllers/adminController');

// Auth
router.post('/login', adminLogin);
router.post('/create', createAdmin);
router.post('/change-password', protectAdmin, (req, res, next) => { console.log('Change password route hit'); next(); }, changeAdminPassword);
router.get('/test-admin', (req, res) => res.send('Admin route working'));

// Dashboard
router.get('/stats', getAdminStats);

// Orders
router.get('/orders', getOrders);
router.post('/orders', createAdminOrder);
router.put('/orders/:id/status', updateOrderStatus);

// Products
router.get('/products', getAdminProducts);
router.post('/products', upload.fields([{ name: 'mainImage', maxCount: 1 }, { name: 'galleryImages', maxCount: 10 }]), createAdminProduct);
router.put('/products/:id', upload.fields([{ name: 'mainImage', maxCount: 1 }, { name: 'galleryImages', maxCount: 10 }]), updateAdminProduct);
router.delete('/products/:id', deleteAdminProduct);
router.post('/products/bulk', upload.single('file'), bulkUploadAdminProduct);
router.get('/products/sample', downloadSampleCSV);

// Shops
router.get('/shops', getShops);
router.post('/shops', createShop);
router.put('/shops/:id', updateShop);
router.delete('/shops/:id', deleteShop);

// Categories
router.get('/categories', getAllCategories);
router.post('/categories', createAdminCategory);
router.put('/categories/:id', updateAdminCategory);
router.delete('/categories/:id', deleteAdminCategory);

// Offers
router.get('/offers', listOffers);
router.post('/offers', createOffer);
router.put('/offers/:id', updateOffer);
router.delete('/offers/:id', deleteOffer);

// Sliders
router.get('/sliders', listSliders);
router.post('/sliders', upload.single('image'), createSlider);
router.put('/sliders/:id', upload.single('image'), updateSlider);
router.delete('/sliders/:id', deleteSlider);

// Blogs
router.get('/blogs', getAllBlogs);
router.post('/blogs', upload.fields([{ name: 'thumbnailImage', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), createBlog);
router.put('/blogs/:id', upload.fields([{ name: 'thumbnailImage', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), updateBlog);
router.delete('/blogs/:id', deleteBlog);
router.post('/blogs/like/:id', likeBlog);

// Enquiries
router.get('/enquiries', listEnquiries);
router.post('/enquiries', createEnquiry);
router.put('/enquiries/:id', updateEnquiry);
router.delete('/enquiries/:id', deleteEnquiry);

module.exports = router;
