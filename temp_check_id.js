const mongoose = require('mongoose');
const Sale = require('./models/Sale');
const Purchase = require('./models/Purchase');
const Product = require('./models/Product');
require('dotenv').config();

const checkId = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const id = '6989b501be7b02b69ba90b01';

        // Check Sales
        let result = await Sale.findById(id);
        if (result) {
            console.log('✅ FOUND IN SALES:', result);
            return;
        } else {
            console.log('❌ NOT FOUND IN SALES');
        }

        // Check Purchases (Common confusion)
        result = await Purchase.findById(id);
        if (result) {
            console.log('✅ FOUND IN PURCHASES:', result);
            return;
        } else {
            console.log('❌ NOT FOUND IN PURCHASES');
        }

        // Check Products (Also common)
        result = await Product.findById(id);
        if (result) {
            console.log('✅ FOUND IN PRODUCTS:', result);
            return;
        } else {
            console.log('❌ NOT FOUND IN PRODUCTS');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

checkId();
