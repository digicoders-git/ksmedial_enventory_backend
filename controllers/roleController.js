const Role = require('../models/Role');
const { logActivity } = require('./activityController');

// @desc    Get all roles for the shop
// @route   GET /api/roles
// @access  Private
const getRoles = async (req, res) => {
    try {
        const roles = await Role.find({ shopId: req.shop._id });
        res.json({ success: true, roles });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single role by ID
// @route   GET /api/roles/:id
// @access  Private
const getRoleById = async (req, res) => {
    try {
        const role = await Role.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (role) {
            res.json({ success: true, role });
        } else {
            res.status(404).json({ success: false, message: 'Role not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a new role
// @route   POST /api/roles
// @access  Private
const createRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;

        const roleExists = await Role.findOne({ shopId: req.shop._id, name });
        if (roleExists) {
            return res.status(400).json({ success: false, message: 'Role with this name already exists' });
        }

        const role = await Role.create({
            shopId: req.shop._id,
            name,
            description,
            permissions: permissions || [] 
        });

        logActivity(req, 'Created Role', `Created new role: ${role.name}`, 'Settings');

        res.status(201).json({ success: true, role });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a role (name, description, permissions)
// @route   PUT /api/roles/:id
// @access  Private
const updateRole = async (req, res) => {
    try {
        const role = await Role.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (role) {
            role.name = req.body.name || role.name;
            role.description = req.body.description !== undefined ? req.body.description : role.description;
            if (req.body.permissions) {
                role.permissions = req.body.permissions;
            }

            const updatedRole = await role.save();

            logActivity(req, 'Updated Role', `Updated role: ${updatedRole.name}`, 'Settings');

            res.json({ success: true, role: updatedRole });
        } else {
            res.status(404).json({ success: false, message: 'Role not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Private
const deleteRole = async (req, res) => {
    try {
        const role = await Role.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (role) {
            await role.deleteOne();
            logActivity(req, 'Deleted Role', `Deleted role: ${role.name}`, 'Settings');
            res.json({ success: true, message: 'Role removed' });
        } else {
            res.status(404).json({ success: false, message: 'Role not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};
