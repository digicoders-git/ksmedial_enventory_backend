const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc    Get all categories for a shop
// @route   GET /api/categories
// @access  Private
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({ shopId: req.shop._id });
        
        // Count products for each category
        const categoriesWithCount = await Promise.all(categories.map(async (cat) => {
            const count = await Product.countDocuments({ 
                shopId: req.shop._id, 
                category: { $regex: new RegExp(`^${cat.name}$`, 'i') } 
            });
            return {
                ...cat._doc,
                count
            };
        }));

        res.json({ success: true, categories: categoriesWithCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
    try {
        const { name, description, color } = req.body;
        const category = await Category.create({
            name,
            description,
            color,
            shopId: req.shop._id
        });
        res.status(201).json({ success: true, category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = async (req, res) => {
    try {
        let category = await Category.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        category = await Category.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        await category.remove();
        res.json({ success: true, message: 'Category removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
