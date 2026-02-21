const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { 
    adminLogin, 
    getAdminStats, 
    getOrders, 
    updateOrderStatus, 
    getAdminProducts, // Changed from getProducts
    createAdminProduct, // Added
    updateAdminProduct, // Added
    deleteAdminProduct, // Added
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
    deleteOffer
} = require('../controllers/adminController');

// Auth
router.post('/login', adminLogin);

// Dashboard
router.get('/stats', getAdminStats);

// Orders
router.get('/orders', getOrders);
router.put('/orders/:id/status', updateOrderStatus);

// Products
router.get('/products', getAdminProducts);
router.post('/products', upload.fields([{ name: 'mainImage', maxCount: 1 }, { name: 'galleryImages', maxCount: 10 }]), createAdminProduct);
router.put('/products/:id', upload.fields([{ name: 'mainImage', maxCount: 1 }, { name: 'galleryImages', maxCount: 10 }]), updateAdminProduct);
router.delete('/products/:id', deleteAdminProduct);

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

module.exports = router;
