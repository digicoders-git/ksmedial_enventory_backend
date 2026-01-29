const Unit = require('../models/Unit');

// @desc    Get all units
// @route   GET /api/units
// @access  Private
const getUnits = async (req, res) => {
    try {
        const units = await Unit.find({ shop: req.shop._id }).sort({ name: 1 });
        res.json({ success: true, units });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a new unit
// @route   POST /api/units
// @access  Private
const createUnit = async (req, res) => {
    try {
        const { name, code } = req.body;

        const unitExists = await Unit.findOne({ shop: req.shop._id, code });
        if (unitExists) {
            return res.status(400).json({ success: false, message: 'Unit code already exists' });
        }

        const unit = await Unit.create({
            name,
            code,
            shop: req.shop._id
        });

        res.status(201).json({ success: true, unit });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a unit
// @route   PUT /api/units/:id
// @access  Private
const updateUnit = async (req, res) => {
    try {
        const { name, code } = req.body;
        const unit = await Unit.findOne({ _id: req.params.id, shop: req.shop._id });

        if (!unit) {
            return res.status(404).json({ success: false, message: 'Unit not found' });
        }

        unit.name = name || unit.name;
        unit.code = code || unit.code;

        const updatedUnit = await unit.save();
        res.json({ success: true, unit: updatedUnit });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a unit
// @route   DELETE /api/units/:id
// @access  Private
const deleteUnit = async (req, res) => {
    try {
        const unit = await Unit.findOne({ _id: req.params.id, shop: req.shop._id });

        if (!unit) {
            return res.status(404).json({ success: false, message: 'Unit not found' });
        }

        // Check if unit is in use by any product? (Skipping for now as strict requirement not given, but good practice)
        
        await unit.remove(); // or deleteOne() depending on mongoose version. Mongoose 6+ often uses deleteOne/findByIdAndDelete
        // Using remove() if document is loaded, but findOneAndDelete is safer for newer mongoose
        // Let's use findByIdAndDelete to be safe if .remove() is deprecated in installed version
        await Unit.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Unit removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getUnits,
    createUnit,
    updateUnit,
    deleteUnit
};
