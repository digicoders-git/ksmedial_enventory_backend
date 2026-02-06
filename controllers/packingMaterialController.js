const PackingMaterial = require('../models/PackingMaterial');

// @desc    Get all packing materials
// @route   GET /api/packing-materials
// @access  Private
const getPackingMaterials = async (req, res) => {
    try {
        const materials = await PackingMaterial.find({ shopId: req.shop._id }).sort({ createdAt: -1 });
        res.json({ success: true, materials });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add new packing material
// @route   POST /api/packing-materials
// @access  Private
const addPackingMaterial = async (req, res) => {
    try {
        const { name, type, dimensions, quantity, unit, minStockLevel, supplier, description } = req.body;
        
        const material = new PackingMaterial({
            name,
            type,
            dimensions,
            quantity: quantity || 0,
            unit,
            minStockLevel,
            supplier,
            description,
            shopId: req.shop._id,
            lastRestocked: quantity > 0 ? new Date() : null
        });

        const createdMaterial = await material.save();
        res.status(201).json({ success: true, material: createdMaterial });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update stock (Add/Consume)
// @route   PUT /api/packing-materials/:id/stock
// @access  Private
const updateStock = async (req, res) => {
    try {
        const { quantity, operation } = req.body; // quantity: number, operation: 'add' or 'subtract'
        
        const material = await PackingMaterial.findOne({ _id: req.params.id, shopId: req.shop._id });
        
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        const qty = Number(quantity);
        if (operation === 'add') {
            material.quantity += qty;
            material.lastRestocked = new Date();
        } else if (operation === 'subtract') {
            if (material.quantity < qty) {
                return res.status(400).json({ success: false, message: 'Insufficient stock' });
            }
            material.quantity -= qty;
        }

        await material.save();
        res.json({ success: true, material });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete packing material
// @route   DELETE /api/packing-materials/:id
// @access  Private
const deletePackingMaterial = async (req, res) => {
    try {
        const material = await PackingMaterial.findOneAndDelete({ _id: req.params.id, shopId: req.shop._id });
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }
        res.json({ success: true, message: 'Material removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getPackingMaterials,
    addPackingMaterial,
    updateStock,
    deletePackingMaterial
};
