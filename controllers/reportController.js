const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Category = require('../models/Category');
const Group = require('../models/Group');

// @desc    Get Inventory Report
// @route   GET /api/reports/inventory
// @access  Private
const getInventoryReport = async (req, res) => {
    try {
        const shopId = req.shop._id;
        const { startDate, endDate } = req.query;

        // Get all products with category and group info
        const products = await Product.find({ shopId })
            .populate('category', 'name')
            .populate('group', 'name')
            .lean();

        // Calculate stats
        const totalItems = products.length;
        const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0);
        const lowStockCount = products.filter(p => p.quantity <= (p.minStockLevel || 10)).length;
        
        // Near expiry (30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const nearExpiryCount = products.filter(p => {
            if (!p.expiryDate) return false;
            return new Date(p.expiryDate) <= thirtyDaysFromNow && new Date(p.expiryDate) > new Date();
        }).length;

        // Category-wise breakdown
        const categoryMap = {};
        products.forEach(p => {
            const catName = p.category?.name || 'Uncategorized';
            if (!categoryMap[catName]) {
                categoryMap[catName] = { name: catName, value: 0, count: 0 };
            }
            categoryMap[catName].value += (p.quantity * p.purchasePrice);
            categoryMap[catName].count += 1;
        });

        const categoryData = Object.values(categoryMap).map(cat => ({
            ...cat,
            percent: totalValue > 0 ? ((cat.value / totalValue) * 100).toFixed(1) : 0
        })).sort((a, b) => b.value - a.value);

        // Low stock items (top 10)
        const lowStockItems = products
            .filter(p => p.quantity <= (p.minStockLevel || 10))
            .sort((a, b) => a.quantity - b.quantity)
            .slice(0, 10)
            .map(p => ({
                name: p.name,
                stock: p.quantity,
                min: p.minStockLevel || 10,
                sku: p.sku
            }));

        // Expiry items (next 30 days, top 10)
        const expiryItems = products
            .filter(p => {
                if (!p.expiryDate) return false;
                const expDate = new Date(p.expiryDate);
                return expDate <= thirtyDaysFromNow && expDate > new Date();
            })
            .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
            .slice(0, 10)
            .map(p => ({
                name: p.name,
                batch: p.batchNumber || 'N/A',
                expiry: new Date(p.expiryDate).toLocaleDateString(),
                daysLeft: Math.ceil((new Date(p.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
            }));

        res.json({
            success: true,
            stats: {
                totalItems,
                totalValue,
                lowStock: lowStockCount,
                nearExpiry: nearExpiryCount
            },
            categoryData,
            lowStockItems,
            expiryItems
        });
    } catch (error) {
        console.error('Inventory Report Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate inventory report' });
    }
};

// @desc    Get Sales Report
// @route   GET /api/reports/sales
// @access  Private
const getSalesReport = async (req, res) => {
    try {
        const shopId = req.shop._id;
        const { startDate, endDate, period = 'month' } = req.query;

        // Date range
        let dateFilter = { shopId };
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else {
            // Default: last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            dateFilter.createdAt = { $gte: thirtyDaysAgo };
        }

        const sales = await Sale.find(dateFilter)
            .populate('items.productId', 'name category')
            .lean();

        // Calculate stats
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalItems = sales.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
        const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

        // Top selling products
        const productSalesMap = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const productName = item.productId?.name || 'Unknown';
                if (!productSalesMap[productName]) {
                    productSalesMap[productName] = { name: productName, quantity: 0, revenue: 0 };
                }
                productSalesMap[productName].quantity += item.quantity;
                productSalesMap[productName].revenue += item.subtotal;
            });
        });

        const topProducts = Object.values(productSalesMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // Daily/Weekly/Monthly trend
        const trendData = [];
        const groupedSales = {};
        
        sales.forEach(sale => {
            const date = new Date(sale.createdAt);
            let key;
            
            if (period === 'day') {
                key = date.toISOString().split('T')[0];
            } else if (period === 'week') {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toISOString().split('T')[0];
            } else {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }

            if (!groupedSales[key]) {
                groupedSales[key] = { date: key, revenue: 0, count: 0 };
            }
            groupedSales[key].revenue += sale.totalAmount;
            groupedSales[key].count += 1;
        });

        const sortedTrend = Object.values(groupedSales).sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            success: true,
            stats: {
                totalSales,
                totalRevenue,
                totalItems,
                avgOrderValue
            },
            topProducts,
            trendData: sortedTrend,
            recentSales: sales.slice(0, 10).map(s => ({
                invoiceNumber: s.invoiceNumber,
                date: new Date(s.createdAt).toLocaleDateString(),
                customer: s.customerId?.name || 'Walk-in',
                amount: s.totalAmount,
                items: s.items.length
            }))
        });
    } catch (error) {
        console.error('Sales Report Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate sales report' });
    }
};

// @desc    Get Profit Report
// @route   GET /api/reports/profit
// @access  Private
const getProfitReport = async (req, res) => {
    try {
        const shopId = req.shop._id;
        const { startDate, endDate } = req.query;

        // Date filter
        let dateFilter = { shopId };
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            dateFilter.createdAt = { $gte: thirtyDaysAgo };
        }

        // Get sales and purchases
        const sales = await Sale.find(dateFilter).populate('items.productId').lean();
        const purchases = await Purchase.find(dateFilter).lean();

        // Calculate revenue
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        
        // Calculate cost of goods sold
        let totalCost = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const purchasePrice = item.productId?.purchasePrice || 0;
                totalCost += purchasePrice * item.quantity;
            });
        });

        // Calculate purchase expenses
        const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

        // Profit calculations
        const grossProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : 0;

        // Product-wise profit
        const productProfitMap = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const productName = item.productId?.name || 'Unknown';
                const purchasePrice = item.productId?.purchasePrice || 0;
                const sellingPrice = item.price;
                const profit = (sellingPrice - purchasePrice) * item.quantity;

                if (!productProfitMap[productName]) {
                    productProfitMap[productName] = {
                        name: productName,
                        profit: 0,
                        revenue: 0,
                        cost: 0,
                        quantity: 0
                    };
                }
                productProfitMap[productName].profit += profit;
                productProfitMap[productName].revenue += item.subtotal;
                productProfitMap[productName].cost += purchasePrice * item.quantity;
                productProfitMap[productName].quantity += item.quantity;
            });
        });

        const productProfits = Object.values(productProfitMap)
            .map(p => ({
                ...p,
                margin: p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(2) : 0
            }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10);

        res.json({
            success: true,
            stats: {
                totalRevenue,
                totalCost,
                grossProfit,
                profitMargin,
                totalPurchases
            },
            productProfits,
            summary: {
                salesCount: sales.length,
                purchaseCount: purchases.length,
                avgProfitPerSale: sales.length > 0 ? (grossProfit / sales.length).toFixed(2) : 0
            }
        });
    } catch (error) {
        console.error('Profit Report Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate profit report' });
    }
};

// @desc    Get Group-wise Report
// @route   GET /api/reports/groups
// @access  Private
const getGroupReport = async (req, res) => {
    try {
        const shopId = req.shop._id;

        // Get all products with group info
        const products = await Product.find({ shopId })
            .populate('group', 'name')
            .populate('category', 'name')
            .lean();

        // Get all groups
        const groups = await Group.find({ shopId }).lean();
        
        // Map products to groups for sales lookup
        const productGroupMap = {}; // productId -> groupId
        products.forEach(p => {
            productGroupMap[p._id] = p.group?._id || 'uncategorized';
        });

        // Group-wise analysis
        const groupData = {};
        
        groups.forEach(group => {
            groupData[group._id] = {
                name: group.name,
                totalProducts: 0,
                totalValue: 0,
                totalStock: 0,
                totalSales: 0,
                categories: {}
            };
        });

        // Add uncategorized group
        groupData['uncategorized'] = {
            name: 'Uncategorized',
            totalProducts: 0,
            totalValue: 0,
            totalStock: 0,
            totalSales: 0,
            categories: {}
        };

        // 1. Calculate Inventory Value & Counts
        products.forEach(product => {
            const groupId = product.group?._id || 'uncategorized';
            const categoryName = product.category?.name || 'Uncategorized';

            if (groupData[groupId]) {
                groupData[groupId].totalProducts += 1;
                groupData[groupId].totalValue += product.quantity * product.purchasePrice;
                groupData[groupId].totalStock += product.quantity;

                if (!groupData[groupId].categories[categoryName]) {
                    groupData[groupId].categories[categoryName] = {
                        name: categoryName,
                        count: 0,
                        value: 0
                    };
                }
                groupData[groupId].categories[categoryName].count += 1;
                groupData[groupId].categories[categoryName].value += product.quantity * product.purchasePrice;
            }
        });

        // 2. Calculate Sales (Revenue) - Last 30 Days default
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const sales = await Sale.find({ 
            shopId, 
            createdAt: { $gte: thirtyDaysAgo } 
        }).lean();

        sales.forEach(sale => {
            sale.items.forEach(item => {
                const pid = item.productId; // Depending on schema, might be object or string in lean?
                // In Sale model, items.productId is ObjectId.
                // We need to match it to our map.
                const groupId = productGroupMap[pid] || 'uncategorized';
                
                if (groupData[groupId]) {
                    // Use item.subtotal if available, else calc
                    const amount = item.subtotal || (item.price * item.quantity);
                    groupData[groupId].totalSales += amount;
                }
            });
        });

        // Convert to array and calculate percentages
        const totalValue = Object.values(groupData).reduce((sum, g) => sum + g.totalValue, 0);
        
        const groupAnalysis = Object.values(groupData)
            .map(group => ({
                ...group,
                categories: Object.values(group.categories),
                percentage: totalValue > 0 ? ((group.totalValue / totalValue) * 100).toFixed(2) : 0
            }))
            .filter(g => g.totalProducts > 0 || g.totalSales > 0) // Show if has products OR sales
            .sort((a, b) => b.totalValue - a.totalValue);

        res.json({
            success: true,
            stats: {
                totalGroups: groupAnalysis.length,
                totalProducts: products.length,
                totalValue
            },
            groupAnalysis
        });
    } catch (error) {
        console.error('Group Report Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate group report' });
    }
};

// @desc    Get Inventory Analysis (Aging & Movement)
// @route   GET /api/reports/analysis
// @access  Private
const getInventoryAnalysis = async (req, res) => {
    try {
        const shopId = req.shop._id;
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        const todayEnd = new Date();
        todayEnd.setHours(23,59,59,999);

        // 1. Get Sales Data (Last 30 Days)
        const sales = await Sale.find({ 
            shopId, 
            createdAt: { $gte: thirtyDaysAgo } 
        }).lean();

        const salesMap = {}; // productId -> qty
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const pid = item.productId?.toString();
                if(pid) {
                    salesMap[pid] = (salesMap[pid] || 0) + item.quantity;
                }
            });
        });

        // 2. Incoming Stock Analysis (Items received Today)
        const todaysPurchases = await Purchase.find({
            shopId,
            createdAt: { $gte: todayStart, $lte: todayEnd }
        }).lean();

        const incomingProductIds = new Set();
        todaysPurchases.forEach(p => {
             p.items.forEach(item => {
                 if(item.productId) incomingProductIds.add(item.productId.toString());
             });
        });

        const incomingProducts = await Product.find({
            shopId,
            _id: { $in: Array.from(incomingProductIds) }
        }).lean();

        const incomingAnalysis = incomingProducts.map(p => {
            const ageDays = Math.floor((new Date() - new Date(p.createdAt)) / (1000 * 60 * 60 * 24));
            const soldLast30 = salesMap[p._id.toString()] || 0;
            return {
                _id: p._id,
                name: p.name,
                sku: p.sku || 'N/A',
                stock: p.quantity,
                ageDays,
                soldLast30,
                isOldStock: ageDays > 30,
                status: soldLast30 === 0 ? 'Dead' : soldLast30 < 10 ? 'Slow' : 'Fast'
            };
        });

        // 3. General Aging Analysis (Items created > 30 days ago with stock)
        const agingProducts = await Product.find({
            shopId,
            createdAt: { $lt: thirtyDaysAgo },
            quantity: { $gt: 0 }
        }).lean();

        const agingAnalysis = agingProducts.map(p => {
            const ageDays = Math.floor((new Date() - new Date(p.createdAt)) / (1000 * 60 * 60 * 24));
            const soldLast30 = salesMap[p._id.toString()] || 0;
            return {
                _id: p._id,
                name: p.name,
                sku: p.sku || 'N/A',
                stock: p.quantity,
                ageDays,
                soldLast30,
                status: soldLast30 === 0 ? 'Dead' : soldLast30 < 10 ? 'Slow' : 'Fast'
            };
        });

        // Metrics
        const totalAgedItems = agingProducts.length;
        const deadStockItems = agingAnalysis.filter(p => p.soldLast30 === 0).length;
        const slowMovingItems = agingAnalysis.filter(p => p.soldLast30 > 0 && p.soldLast30 < 10).length;

        // Sort Aging Analysis by least sold, then oldest
        agingAnalysis.sort((a, b) => a.soldLast30 - b.soldLast30 || b.ageDays - a.ageDays);

        res.json({
            success: true,
            incomingAnalysis,
            agingAnalysis: agingAnalysis.slice(0, 100),
            stats: {
                totalAgedItems,
                deadStockItems,
                slowMovingItems
            }
        });

    } catch (error) {
        console.error('Inventory Analysis Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getInventoryReport,
    getSalesReport,
    getProfitReport,
    getGroupReport,
    getInventoryAnalysis
};
