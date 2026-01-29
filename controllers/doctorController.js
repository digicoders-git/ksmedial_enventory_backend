const Doctor = require('../models/Doctor');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Private
const getDoctors = async (req, res) => {
    try {
        const pageSize = Number(req.query.pageSize) || 10;
        const page = Number(req.query.pageNumber) || 1;
        const keyword = req.query.keyword ? {
            $or: [
                { name: { $regex: req.query.keyword, $options: 'i' } },
                { hospital: { $regex: req.query.keyword, $options: 'i' } },
                { specialization: { $regex: req.query.keyword, $options: 'i' } },
                { phone: { $regex: req.query.keyword, $options: 'i' } },
            ]
        } : {};

        const count = await Doctor.countDocuments({ ...keyword, shopId: req.shop._id });
        const doctors = await Doctor.find({ ...keyword, shopId: req.shop._id })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({ success: true, doctors, page, pages: Math.ceil(count / pageSize), total: count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Private
const getDoctorById = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (doctor) {
            res.json({ success: true, doctor });
        } else {
            res.status(404).json({ success: false, message: 'Doctor not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a doctor
// @route   POST /api/doctors
// @access  Private
const createDoctor = async (req, res) => {
    try {
        const { name, specialization, qualification, hospital, phone, email, address, commission, status } = req.body;
        
        const doctor = await Doctor.create({
            name,
            specialization,
            qualification,
            hospital,
            phone,
            email,
            address,
            commission,
            status: status || 'Active',
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

        await doctor.deleteOne();
        res.json({ success: true, message: 'Doctor removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor
};
