const mongoose = require('mongoose');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Purchase = require('../models/Purchase');
const Order = require('../models/Order');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
    try {
        const shopId = req.shop._id;

        // 1. Total Medicines Count (Live only for stock dashboard)
        const totalMedicines = await Product.countDocuments({ shopId, isInventoryLive: true });

        // 2. Low Stock Count
        const lowStockMedicines = await Product.countDocuments({ 
            shopId, 
            isInventoryLive: true,
            quantity: { $gt: 0, $lte: 20 } 
        });

        // 3. Out of Stock Count
        const outOfStockMedicines = await Product.countDocuments({ 
            shopId, 
            isInventoryLive: true,
            quantity: 0 
        });

        // 4. Total Stock Value
        const stockItems = await Product.find({ shopId, isInventoryLive: true });
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
        const categories = await Product.distinct('category', { shopId, isInventoryLive: true });
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
            { $match: { shopId: new mongoose.Types.ObjectId(shopId), isInventoryLive: true } },
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

        // 13. Enhanced GRN Stats
        const now = new Date();
        const pendingPurchases = await Purchase.find({ 
            shopId, 
            status: 'Pending' 
        }).populate('supplierId', 'name').sort({ purchaseDate: -1 });

        // Calculate Ageing for Pending GRNs
        const ageingBuckets = {
            '0-6h': 0,
            '6-12h': 0,
            '12-24h': 0,
            '1-3d': 0,
            '>3d': 0
        };

        pendingPurchases.forEach(p => {
            const diffInHours = (now - new Date(p.purchaseDate)) / (1000 * 60 * 60);
            if (diffInHours <= 6) ageingBuckets['0-6h']++;
            else if (diffInHours <= 12) ageingBuckets['6-12h']++;
            else if (diffInHours <= 24) ageingBuckets['12-24h']++;
            else if (diffInHours <= 72) ageingBuckets['1-3d']++;
            else ageingBuckets['>3d']++;
        });

        const pendingGrnBySupplier = await Purchase.aggregate([
            { $match: { shopId: new mongoose.Types.ObjectId(shopId), status: 'Pending' } },
            { $lookup: { from: 'suppliers', localField: 'supplierId', foreignField: '_id', as: 'supplier' } },
            { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
            { 
                $group: { 
                    _id: { $ifNull: ['$supplier.name', 'Unknown'] }, 
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$grandTotal" }
                } 
            },
            { $sort: { totalAmount: -1 } }
        ]);

        // 13.5 Financial Liability (Received but Pending Payment)
        const financialLiability = await Purchase.aggregate([
            { 
                $match: { 
                    shopId: new mongoose.Types.ObjectId(shopId), 
                    status: 'Received', // Only confirmed GRNs
                    paymentStatus: { $in: ['Pending', 'Partial'] } // Unpaid or Partially Paid
                } 
            },
            { $lookup: { from: 'suppliers', localField: 'supplierId', foreignField: '_id', as: 'supplier' } },
            { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
            { 
                $group: { 
                    _id: { $ifNull: ['$supplier.name', 'Unknown'] }, 
                    count: { $sum: 1 },
                    // Simplified: Assuming grandTotal is the liability for now. 
                    // Ideally, track 'balanceAmount' if partial payments exist.
                    // For now, let's sum grandTotal for unpaid ones.
                    totalLiability: { $sum: "$grandTotal" } 
                } 
            },
            { $sort: { totalLiability: -1 } }
        ]);

        // 14. Advanced Queue Analytics & Workflow
        const allOrders = await Order.find();
        
        // Helper to bucket orders by hours
        const getAgeBuckets = (ordersList) => {
            const buckets = { '0-3': 0, '3-6': 0, '6-12': 0, '12-24': 0, '24-36': 0, '36-48': 0, '>48': 0 };
            const now = new Date();
            ordersList.forEach(o => {
                const date = o.createdAt || o.purchaseDate || new Date(); // Fallback for robustness
                const diffMs = now - new Date(date);
                const hours = diffMs / (1000 * 60 * 60);
                
                if (hours <= 3) buckets['0-3']++;
                else if (hours <= 6) buckets['3-6']++;
                else if (hours <= 12) buckets['6-12']++;
                else if (hours <= 24) buckets['12-24']++;
                else if (hours <= 36) buckets['24-36']++;
                else if (hours <= 48) buckets['36-48']++;
                else buckets['>48']++;
            });
            return {
                categories: Object.keys(buckets),
                data: Object.values(buckets),
                total: ordersList.length
            };
        };

        const todayStr = new Date().toDateString();

        // Fetch broader set for Inbound Queues
        const inboundPurchases = await Purchase.find({
            shopId,
            status: { $in: ['Pending', 'Received', 'Putaway_Pending'] }
        });

        const queueStats = {
            all: getAgeBuckets(allOrders), // Added for Total Order Ageing Chart
            rapid: getAgeBuckets(allOrders.filter(o => o.rapidOrderType && o.rapidOrderType !== 'N/A')),
            onHold: getAgeBuckets(allOrders.filter(o => o.status === 'On Hold')),
            picking: getAgeBuckets(allOrders.filter(o => o.status === 'Picking')),
            qualityCheck: getAgeBuckets(allOrders.filter(o => o.status === 'Quality Check' || o.status === 'Under QC')),
            packing: getAgeBuckets(allOrders.filter(o => o.status === 'Packing')),
            shipping: getAgeBuckets(allOrders.filter(o => o.status === 'Shipping' || o.status === 'shipped')),
            problem: getAgeBuckets(allOrders.filter(o => o.status === 'Problem Queue')),
            billing: getAgeBuckets(allOrders.filter(o => o.status === 'Billing')),
            returns: getAgeBuckets(allOrders.filter(o => o.status === 'Returned' || o.status === 'Sales Return')),
            
            // Inbound Queues (Corrected to include Received/Putaway items)
            inbound: {
                overall: getAgeBuckets(inboundPurchases),
                pendingInvoices: getAgeBuckets(inboundPurchases.filter(p => p.status === 'Pending')),
                physicalValidation: getAgeBuckets(inboundPurchases.filter(p => p.status === 'Received')), 
                grn: getAgeBuckets(inboundPurchases.filter(p => p.status === 'Pending'))
            }
        };

        const kpi = {
            totalOrders: allOrders.length,
            processedOrders: allOrders.filter(o => ['shipped', 'delivered'].includes(o.status)).length,
            pushedBack: allOrders.filter(o => o.status === 'Problem Queue').length,
            dailyShipped: allOrders.filter(o => ['shipped', 'delivered'].includes(o.status) && new Date(o.updatedAt).toDateString() === todayStr).length,
            avgPickingTime: "34m", // Placeholder/Mock
            avgQCTime: "15m", // Placeholder/Mock
            fulfilledRate: "98.5%" // Placeholder/Mock
        };

        // Existing simple workflow for backward compatibility if needed
        const orderWorkflow = {
            total: allOrders.length,
            picking: queueStats.picking.total,
            onHold: queueStats.onHold.total,
            billing: queueStats.billing.total,
            packing: queueStats.packing.total,
            shipping: queueStats.shipping.total,
            problemQueue: queueStats.problem.total,
            delivered: allOrders.filter(o => o.status === 'delivered').length,
            dailyOrders: allOrders.filter(o => new Date(o.createdAt).toDateString() === todayStr).length,
            last7DaysTrend: [] // Will calc below
        };

        // Calculate last 7 days order trend
        const last7DaysTrend = [];
        for (let i = 6; i >= 0; i--) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - i);
            const dateStr = targetDate.toDateString();
            const count = allOrders.filter(o => new Date(o.createdAt).toDateString() === dateStr).length;
            last7DaysTrend.push(count);
        }
        orderWorkflow.last7DaysTrend = last7DaysTrend;

        // 15. Medicine Ageing (28 Days since Purchase)
        const twentyEightDaysAgo = new Date();
        twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

        // Find medicines whose last purchase was more than 28 days ago
        // Or medicines created more than 28 days ago that haven't been purchased
        const productsForAgeing = await Product.find({ shopId, quantity: { $gt: 0 } });
        let agedMedicinesCount = 0;
        const agedMedicinesList = [];

        for(const prod of productsForAgeing) {
            const lastPurchase = await Purchase.findOne({ 
                shopId, 
                'items.productId': prod._id 
            }).sort({ purchaseDate: -1 });

            const referenceDate = lastPurchase ? new Date(lastPurchase.purchaseDate) : new Date(prod.createdAt);
            
            if (referenceDate < twentyEightDaysAgo) {
                agedMedicinesCount++;
                agedMedicinesList.push({
                    id: prod._id,
                    name: prod.name,
                    qty: prod.quantity,
                    days: Math.floor((now - referenceDate) / (1000 * 60 * 60 * 24))
                });
            }
        }

        // 16. Daily Closing Summary (Payment Mode Breakdown)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const paymentStats = await Sale.aggregate([
            {
                $match: {
                    shopId: new mongoose.Types.ObjectId(shopId),
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                    status: { $in: ['Paid', 'Partial'] } // Only count valid sales
                }
            },
            {
                $group: {
                    _id: "$paymentMethod",
                    totalAmount: { $sum: "$totalAmount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format to ensure all modes are present even if 0 (Cash, Online, Card, UPI, Credit)
        const formattedPaymentStats = {
            Cash: 0,
            Online: 0,
            Card: 0,
            UPI: 0,
            Credit: 0
        };

        paymentStats.forEach(stat => {
            if (formattedPaymentStats.hasOwnProperty(stat._id)) {
                formattedPaymentStats[stat._id] = stat.totalAmount;
            }
        });

        res.json({
            success: true,
            stats: {
                inventoryStatus: outOfStockMedicines > (req.shop.inventorySettings?.outOfStockAlertThreshold || 5) ? "Alert" : "Good",
                alertThreshold: req.shop.inventorySettings?.outOfStockAlertThreshold || 5,
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
                totalStockUnits: stockItems.reduce((acc, item) => acc + item.quantity, 0),
                orderWorkflow,
                agedMedicines: {
                    count: agedMedicinesCount,
                    list: agedMedicinesList.slice(0, 10) // Top 10 aged items
                },
                pendingGrnStats: {
                    totalPending: pendingPurchases.length,
                    ageing: Object.keys(ageingBuckets).map(key => ({ name: key, y: ageingBuckets[key] })),
                    supplierBreakup: pendingGrnBySupplier.map(item => ({
                        name: item._id,
                        y: item.count,
                        amount: item.totalAmount
                    })),
                    financialLiability: financialLiability.map(item => ({
                        name: item._id,
                        y: item.count,
                        amount: item.totalLiability
                    })),
                    invoiceQueue: pendingPurchases.map(p => ({
                        id: p._id,
                        invoiceNumber: p.invoiceNumber,
                        supplier: p.supplierId?.name || 'Unknown',
                        supplierId: p.supplierId?._id,
                        date: p.purchaseDate,
                        amount: p.grandTotal,
                        items: p.items.length
                    }))
                },
                queueStats, // Detailed queue analytics
                dailyClosingStats: formattedPaymentStats, // New Daily Closing Stats
                kpi // High-level KPIs
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
