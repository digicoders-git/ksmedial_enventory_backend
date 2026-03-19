const Picker = require('../models/Picker');

// @desc    Get all pickers
// @route   GET /api/pickers
exports.getPickers = async (req, res) => {
    try {
        const pickers = await Picker.find().sort({ totalOrdersPicked: -1 });
        res.json({ success: true, pickers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add new picker
// @route   POST /api/pickers
exports.addPicker = async (req, res) => {
    try {
        const { name, phone } = req.body;
        
        const existing = await Picker.findOne({ name });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Picker name already exists' });
        }

        const picker = await Picker.create({ name, phone });
        res.status(201).json({ success: true, picker });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle picker activity
// @route   PUT /api/pickers/:id/status
exports.togglePickerStatus = async (req, res) => {
    try {
        const picker = await Picker.findById(req.params.id);
        if (!picker) return res.status(404).json({ success: false, message: 'Picker not found' });

        picker.isActive = !picker.isActive;
        await picker.save();
        res.json({ success: true, picker });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
