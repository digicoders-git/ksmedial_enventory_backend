// Server Entry Point - Updated
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Load env vars
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
// Middleware
app.use(cors({
    origin: true, // Dynamically allow any origin that makes the request
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200
}));



// Increase payload limit for image uploads and bulk operations
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve Uploads
const path = require('path');
const uploadsDir = path.resolve('uploads');
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir));

// Basic Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const groupRoutes = require('./routes/groupRoutes');
const salesRoutes = require('./routes/salesRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const customerRoutes = require('./routes/customerRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const profileRoutes = require('./routes/profileRoutes');
const unitRoutes = require('./routes/unitRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/sales/returns', require('./routes/saleReturnRoutes'));
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/purchase-returns', require('./routes/purchaseReturnRoutes'));
app.use('/api/doctors', doctorRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/security', require('./routes/securityRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));
app.use('/api/units', unitRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/grn', require('./routes/grnRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/physical-receiving', require('./routes/physicalReceivingRoutes'));
app.use('/api/packing-materials', require('./routes/packingMaterialRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrderRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/kyc', require('./routes/kycRoutes'));
app.use('/api/withdrawals', require('./routes/withdrawalRoutes'));
app.use('/api/mlm', require('./routes/mlmRoutes'));

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
