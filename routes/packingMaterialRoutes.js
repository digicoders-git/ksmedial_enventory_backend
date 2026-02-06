const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getPackingMaterials,
    addPackingMaterial,
    updateStock,
    deletePackingMaterial
} = require('../controllers/packingMaterialController');

router.use(protect);

router.route('/')
    .get(getPackingMaterials)
    .post(addPackingMaterial);

router.route('/:id/stock').put(updateStock);
router.route('/:id').delete(deletePackingMaterial);

module.exports = router;
