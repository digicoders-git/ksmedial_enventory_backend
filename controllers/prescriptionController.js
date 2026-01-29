const Prescription = require('../models/Prescription');

// @desc    Get all prescriptions
// @route   GET /api/prescriptions
// @access  Private
const getPrescriptions = async (req, res) => {
    try {
        const prescriptions = await Prescription.find({ shop: req.shop._id }).sort({ createdAt: -1 });
        res.json({ success: true, prescriptions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a new prescription (Upload)
// @route   POST /api/prescriptions
// @access  Private
const createPrescription = async (req, res) => {
    try {
        const { patient, age, gender, phone, address, doctor, urgency, image, notes } = req.body;

        const prescription = await Prescription.create({
            patient,
            age,
            gender: gender || 'Unknown',
            phone: phone || 'N/A',
            address: address || 'N/A',
            doctor: doctor || 'Self/Unknown',
            urgency: urgency || 'Normal',
            image, // Assuming base64 string or URL
            shop: req.shop._id
        });

        res.status(201).json({ success: true, prescription });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update prescription status
// @route   PUT /api/prescriptions/:id/status
// @access  Private
const updatePrescriptionStatus = async (req, res) => {
    try {
        const { status, reason } = req.body;
        const prescription = await Prescription.findOne({ _id: req.params.id, shop: req.shop._id });

        if (!prescription) {
            return res.status(404).json({ success: false, message: 'Prescription not found' });
        }

        prescription.status = status;
        if (reason) prescription.reason = reason;

        const updatedPrescription = await prescription.save();
        res.json({ success: true, prescription: updatedPrescription });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete prescription
// @route   DELETE /api/prescriptions/:id
// @access  Private
const deletePrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findOneAndDelete({ _id: req.params.id, shop: req.shop._id });
         if (!prescription) {
            return res.status(404).json({ success: false, message: 'Prescription not found' });
        }
        res.json({ success: true, message: 'Prescription removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getPrescriptions,
    createPrescription,
    updatePrescriptionStatus,
    deletePrescription
};
