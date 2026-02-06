const PhysicalReceiving = require('../models/PhysicalReceiving');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// @desc    Create a new Physical Receiving Entry
// @route   POST /api/physical-receiving
// @access  Private
const createEntry = asyncHandler(async (req, res) => {
    const {
        supplierName,
        invoiceNumber,
        invoiceValue,
        skuCount,
        invoiceDate,
        orderNumber,
        boxCount,
        polyCount,
        location,
        poIds,
        isPoNotPresent
    } = req.body;

    // Generate IDs
    const systemId = `SYS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const physicalReceivingId = `PHY-${randomSuffix}`;

    const entry = await PhysicalReceiving.create({
        supplierName,
        invoiceNumber,
        invoiceValue,
        skuCount,
        invoiceDate,
        orderNumber,
        boxCount,
        polyCount,
        location,
        poIds,
        isPoNotPresent,
        systemId,
        physicalReceivingId,
        status: 'Pending'
    });

    res.status(201).json({
        success: true,
        data: entry
    });
});

// @desc    Get all entries
// @route   GET /api/physical-receiving
// @access  Private
const getEntries = asyncHandler(async (req, res) => {
    const { status, supplier, startDate, endDate, grnStatus, invoiceNumber, physicalReceivingId } = req.query;

    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;

    const query = {};

    if (status) {
        query.status = status;
    }

    if (grnStatus) {
        query.grnStatus = grnStatus;
    }

    if (supplier) {
        query.supplierName = { $regex: supplier, $options: 'i' };
    }

    if (invoiceNumber) {
        query.invoiceNumber = { $regex: invoiceNumber, $options: 'i' };
    }

    if (physicalReceivingId) {
        query.physicalReceivingId = { $regex: physicalReceivingId, $options: 'i' };
    }

    if (startDate && endDate) {
        query.invoiceDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const count = await PhysicalReceiving.countDocuments(query);
    const entries = await PhysicalReceiving.find(query)
        .sort({ createdAt: -1 })
        .limit(pageSize)
        .skip(pageSize * (page - 1));

    res.json({
        success: true,
        data: entries,
        page,
        pages: Math.ceil(count / pageSize),
        total: count
    });
});

// @desc    Update GRN Status
// @route   PUT /api/physical-receiving/:id/grn-status
// @access  Private
const updateGRNStatus = asyncHandler(async (req, res) => {
    const { grnStatus, grnId, invoiceImageUrl } = req.body;
    
    const entry = await PhysicalReceiving.findById(req.params.id);

    if (entry) {
        entry.grnStatus = grnStatus || 'Done';
        entry.grnDate = Date.now();
        if(grnId) entry.grnId = grnId;
        if(invoiceImageUrl) entry.invoiceImageUrl = invoiceImageUrl;

        const updatedEntry = await entry.save();
        res.json({ success: true, data: updatedEntry });
    } else {
        res.status(404);
        throw new Error('Entry not found');
    }
});

// @desc    Get entry by ID or Physical ID
// @route   GET /api/physical-receiving/:id
// @access  Private
const getEntry = asyncHandler(async (req, res) => {
    // Try to find by _id first, then by physicalReceivingId
    let entry;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        entry = await PhysicalReceiving.findById(req.params.id);
    } 
    
    if (!entry) {
        entry = await PhysicalReceiving.findOne({ physicalReceivingId: req.params.id });
    }

    if (entry) {
        res.json({
            success: true,
            data: entry
        });
    } else {
        res.status(404);
        throw new Error('Entry not found');
    }
});

// @desc    Mark entry as Done
// @route   PUT /api/physical-receiving/:id/validate
// @access  Private
const validateEntry = asyncHandler(async (req, res) => {
    const { validatedBy } = req.body;
    
    const entry = await PhysicalReceiving.findById(req.params.id);

    if (entry) {
        entry.status = 'Done';
        entry.validatedBy = validatedBy || 'Staff'; // Default if not provided
        entry.validationDate = Date.now();

        const updatedEntry = await entry.save();

        res.json({
            success: true,
            data: updatedEntry
        });
    } else {
        res.status(404);
        throw new Error('Entry not found');
    }
});

module.exports = {
    createEntry,
    getEntries,
    getEntry,
    validateEntry,
    updateGRNStatus
};
