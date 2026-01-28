const Doctor = require('../models/Doctor');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Private
const getDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find({ shopId: req.shop._id });
        res.json({ success: true, doctors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a doctor
// @route   POST /api/doctors
// @access  Private
const createDoctor = async (req, res) => {
    try {
        const { name, specialization, hospital, phone, email, address, commission } = req.body;
        
        const doctor = await Doctor.create({
            name,
            specialization,
            hospital,
            phone,
            email,
            address,
            commission,
            shopId: req.shop._id
        });

        res.status(201).json({ success: true, doctor });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a doctor
// @route   PUT /api/doctors/:id
// @access  Private
const updateDoctor = async (req, res) => {
    try {
        let doctor = await Doctor.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, doctor });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a doctor
// @route   DELETE /api/doctors/:id
// @access  Private
const deleteDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        await doctor.remove();
        res.json({ success: true, message: 'Doctor removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getDoctors,
    createDoctor,
    updateDoctor,
    deleteDoctor
};
