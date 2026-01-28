const Group = require('../models/Group');
const Product = require('../models/Product');

// @desc    Get all groups for a shop
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
    try {
        const groups = await Group.find({ shopId: req.shop._id });
        
        // Count products for each group
        const groupsWithCount = await Promise.all(groups.map(async (grp) => {
            const count = await Product.countDocuments({ shopId: req.shop._id, category: grp.name });
            return {
                ...grp._doc,
                count
            };
        }));

        res.json({ success: true, groups: groupsWithCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
    try {
        const { name, description } = req.body;
        const group = await Group.create({
            name,
            description,
            shopId: req.shop._id
        });
        res.status(201).json({ success: true, group });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a group
// @route   PUT /api/groups/:id
// @access  Private
const updateGroup = async (req, res) => {
    try {
        let group = await Group.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        group = await Group.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, group });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a group
// @route   DELETE /api/groups/:id
// @access  Private
const deleteGroup = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        await group.remove();
        res.json({ success: true, message: 'Group removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getGroups,
    createGroup,
    updateGroup,
    deleteGroup
};
