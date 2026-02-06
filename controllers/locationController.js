const Location = require('../models/Location');
const QRCode = require('qrcode');

// @desc    Create new location
// @route   POST /api/locations
// @access  Private
const createLocation = async (req, res) => {
    try {
        const {
            vendorName,
            category,
            aisle,
            rack,
            shelf,
            bin,
            partition,
            status,
            temperatureType
        } = req.body;

        // Auto-generate Location Code if not provided based on hierarchy
        // Format: Aisle-Rack-Shelf-Bin-Partition (e.g., 0-R04-S09-1-0)
        const locationCode = `${aisle}-${rack}-${shelf}-${bin}-${partition || '0'}`;

        const locationExists = await Location.findOne({ locationCode, shopId: req.shop._id });
        if (locationExists) {
            return res.status(400).json({ success: false, message: 'Location already exists' });
        }

        // Generate QR Code
        const qrCodeData = await QRCode.toDataURL(locationCode);

        const location = await Location.create({
            shopId: req.shop._id,
            locationCode,
            vendorName,
            category,
            aisle,
            rack,
            shelf,
            bin,
            partition: partition || '0',
            status,
            temperatureType,
            qrCode: qrCodeData
        });

        res.status(201).json({ success: true, location });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private
const getLocations = async (req, res) => {
    try {
        const pageSize = Number(req.query.pageSize) || 25;
        const page = Number(req.query.pageNumber) || 1;
        const keyword = req.query.keyword ? {
            locationCode: { $regex: req.query.keyword, $options: 'i' }
        } : {};
        
        const filter = { shopId: req.shop._id, ...keyword };
        
        if(req.query.category) filter.category = req.query.category;
        if(req.query.status) filter.status = req.query.status;

        const count = await Location.countDocuments(filter);
        const locations = await Location.find(filter)
            .sort({ locationCode: 1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({
            success: true,
            locations,
            page,
            pages: Math.ceil(count / pageSize),
            total: count
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private
const updateLocation = async (req, res) => {
    try {
        const location = await Location.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (location) {
            location.vendorName = req.body.vendorName || location.vendorName;
            location.category = req.body.category || location.category;
            location.status = req.body.status || location.status;
            location.temperatureType = req.body.temperatureType || location.temperatureType;
            
            // Re-generate QR if hierarchy changes (optional, usually hierarchy shouldn't change easily)
            
            const updatedLocation = await location.save();
            res.json({ success: true, location: updatedLocation });
        } else {
            res.status(404).json({ success: false, message: 'Location not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Private
const deleteLocation = async (req, res) => {
    try {
        const location = await Location.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (location) {
            await location.remove();
            res.json({ success: true, message: 'Location removed' });
        } else {
            res.status(404).json({ success: false, message: 'Location not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk Create Locations
// @route   POST /api/locations/bulk
// @access  Private
const bulkCreateLocations = async (req, res) => {
    try {
        const { locations } = req.body; // Array of location objects
        const createdLocations = [];
        const errors = [];

        for (const loc of locations) {
            try {
                 const locationCode = `${loc.aisle}-${loc.rack}-${loc.shelf}-${loc.bin}-${loc.partition || '0'}`;
                 
                 // Check duplicate in DB
                 const exists = await Location.findOne({ locationCode, shopId: req.shop._id });
                 if(exists) {
                     errors.push(`Duplicate: ${locationCode}`);
                     continue;
                 }
                 
                 const qrCodeData = await QRCode.toDataURL(locationCode);
                 
                 const newLoc = await Location.create({
                    shopId: req.shop._id,
                    locationCode,
                    vendorName: loc.vendorName,
                    category: loc.category,
                    aisle: loc.aisle,
                    rack: loc.rack,
                    shelf: loc.shelf,
                    bin: loc.bin,
                    partition: loc.partition || '0',
                    status: loc.status || 'Active',
                    temperatureType: loc.temperatureType || 'Normal',
                    qrCode: qrCodeData
                });
                createdLocations.push(newLoc);

            } catch (err) {
                errors.push(`Error for ${loc.aisle}-${loc.rack}: ${err.message}`);
            }
        }

        res.json({ success: true, created: createdLocations.length, errors });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createLocation,
    getLocations,
    updateLocation,
    deleteLocation,
    bulkCreateLocations
};
