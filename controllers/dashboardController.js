const mongoose = require('mongoose');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Purchase = require('../models/Purchase');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
    try {
        const shopId = req.shop._id;

        // 1. Total Medicines Count
        const totalMedicines = await Product.countDocuments({ shopId });

        // 2. Low Stock Count (e.g., < 20)
        // In a real app, this should compare against individual product's reorderLevel
        const lowStockMedicines = await Product.countDocuments({ 
            shopId, 
            quantity: { $gt: 0, $lte: 20 } 
        });

        // 3. Out of Stock Count
        const outOfStockMedicines = await Product.countDocuments({ 
            shopId, 
            quantity: 0 
        });

        // 4. Total Stock Value
        const stockItems = await Product.find({ shopId });
        const totalStockValue = stockItems.reduce((acc, item) => acc + (item.quantity * item.sellingPrice), 0);

        // 5. Sales Stats (Current Month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const recentSales = await Sale.find({ 
            shopId, 
            createdAt: { $gte: startOfMonth } 
        });

        const monthlyRevenue = recentSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
        const monthlyInvoices = recentSales.length;
        const itemsSold = recentSales.reduce((acc, sale) => {
            return acc + sale.items.reduce((sum, item) => sum + item.quantity, 0);
        }, 0);

        // 6. People counts
        const totalSuppliers = await Supplier.countDocuments({ shopId });
        const totalCustomers = await Customer.countDocuments({ shopId });

        // 7. Medicine Groups (Distinct Categories)
        const categories = await Product.distinct('category', { shopId });
        const totalGroups = categories.filter(c => c).length;

        // 8. Monthly Revenue Data for Chart (Current Year)
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        
        const chartData = await Sale.aggregate([
            {
                $match: {
                    shopId: new mongoose.Types.ObjectId(shopId),
                    createdAt: { $gte: startOfYear }
                }
            },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" } },
                    revenue: { $sum: "$totalAmount" }
                }
            },
            { $sort: { "_id.month": 1 } }
        ]);

        // Initialize array with zeros for all 12 months
        const monthlyRevenueArray = new Array(12).fill(0);
        chartData.forEach(item => {
            monthlyRevenueArray[item._id.month - 1] = item.revenue;
        });

        // 9. Category Distribution (for Pie Chart)
        const categoryStats = await Product.aggregate([
            { $match: { shopId: new mongoose.Types.ObjectId(shopId) } },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        const categoryDistribution = categoryStats.map(item => ({
            name: item._id || 'Uncategorized',
            y: item.count
        }));

        // 10. Weekly Movement Trends (Stock In vs Stock Out)
        // For simplicity, let's get last 7 days from Sale and a hypothetical Purchase/StockIn model
        // Since we only have Sale model for now, let's use recent sales for 'Stock Out'
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const weeklyStockOut = await Sale.aggregate([
            { 
                $match: { 
                    shopId: new mongoose.Types.ObjectId(shopId),
                    createdAt: { $gte: sevenDaysAgo }
                } 
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$createdAt" },
                    count: { $sum: { $reduce: { input: "$items", initialValue: 0, in: { $add: ["$$value", "$$this.quantity"] } } } }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const stockOutData = new Array(7).fill(0);
        weeklyStockOut.forEach(item => {
            const days = [6, 0, 1, 2, 3, 4, 5];
            stockOutData[days[item._id - 1]] = item.count;
        });

        // Calculate Stock In from Purchases
        const weeklyStockIn = await Purchase.aggregate([
            { 
                $match: { 
                    shopId: new mongoose.Types.ObjectId(shopId),
                    purchaseDate: { $gte: sevenDaysAgo }
                } 
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$purchaseDate" },
                    count: { $sum: { $reduce: { input: "$items", initialValue: 0, in: { $add: ["$$value", "$$this.quantity"] } } } }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const stockInData = new Array(7).fill(0);
        weeklyStockIn.forEach(item => {
            const days = [6, 0, 1, 2, 3, 4, 5];
            stockInData[days[item._id - 1]] = item.count;
        });

        // 11. Recent Transactions (Join of various logs, for now just Sales)
        const recentTransactions = await Sale.find({ shopId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('customerId', 'name');

        // 12. Find a frequently bought item (basic logic)
        let featuredProduct = "N/A";
        const allSales = await Sale.find({ shopId, createdAt: { $gte: startOfMonth } });
        if (allSales.length > 0) {
            const productCounts = {};
            allSales.forEach(sale => {
                sale.items.forEach(item => {
                    productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
                });
            });
            featuredProduct = Object.keys(productCounts).reduce((a, b) => productCounts[a] > productCounts[b] ? a : b, "N/A");
        }

        res.json({
            success: true,
            stats: {
                inventoryStatus: outOfStockMedicines > 5 ? "Alert" : "Good",
                totalRevenue: monthlyRevenue,
                totalMedicines,
                shortageCount: lowStockMedicines + outOfStockMedicines,
                totalGroups,
                itemsSold,
                monthlyInvoices,
                totalSuppliers,
                totalCustomers,
                featuredProduct,
                totalStockValue,
                monthlyRevenue: monthlyRevenueArray,
                categoryDistribution,
                weeklyMovement: {
                    stockOut: stockOutData,
                    stockIn: stockInData
                },
                pendingRx: 0,
                recentTransactions: recentTransactions.map(tx => ({
                    id: tx._id,
                    type: 'OUT',
                    items: tx.items.map(i => ({ name: i.name, qty: i.quantity })),
                    totalQty: tx.items.reduce((acc, i) => acc + i.quantity, 0),
                    date: tx.createdAt,
                    customer: tx.customerName || (tx.customerId ? tx.customerId.name : 'Guest')
                })),
                lowStockItems: lowStockMedicines,
                outOfStockItems: outOfStockMedicines,
                totalStockUnits: stockItems.reduce((acc, item) => acc + item.quantity, 0)
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Global search across all modules
// @route   GET /api/dashboard/search?q=query
// @access  Private
const getGlobalSearch = async (req, res) => {
    try {
        const { q } = req.query;
        const shopId = req.shop._id;

        if (!q || q.length < 2) {
            return res.json({ success: true, results: [] });
        }

        const searchRegex = new RegExp(q, 'i');

        // Search in Products
        const products = await Product.find({
            shopId,
            $or: [
                { name: searchRegex },
                { batchNumber: searchRegex },
                { sku: searchRegex }
            ]
        }).limit(5);

        // Search in Suppliers
        const suppliers = await Supplier.find({
            shopId,
            $or: [
                { name: searchRegex },
                { phone: searchRegex }
            ]
        }).limit(5);

        // Search in Customers
        const customers = await Customer.find({
            shopId,
            $or: [
                { name: searchRegex },
                { phone: searchRegex }
            ]
        }).limit(5);

        // Search in Sales (Invoices)
        const sales = await Sale.find({
            shopId,
            invoiceNumber: searchRegex
        }).limit(5);

        // Format results
        const results = [
            ...products.map(p => ({ id: p._id, title: p.name, subtitle: `Medicine - Batch: ${p.batchNumber}`, type: 'medicine', link: `/inventory/stock` })),
            ...suppliers.map(s => ({ id: s._id, title: s.name, subtitle: `Supplier - ${s.phone}`, type: 'supplier', link: `/purchase/suppliers` })),
            ...customers.map(c => ({ id: c._id, title: c.name, subtitle: `Customer - ${c.phone}`, type: 'customer', link: `/people/customers` })),
            ...sales.map(s => ({ id: s._id, title: s.invoiceNumber, subtitle: `Invoice - ₹${s.totalAmount}`, type: 'invoice', link: `/sales/invoices` }))
        ];

        res.json({ success: true, results });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getGlobalSearch
};
