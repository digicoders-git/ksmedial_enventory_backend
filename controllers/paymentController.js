const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc    Get Razorpay Key (Public - for mobile app)
// @route   GET /api/payment/key
// @access  Public
const getRazorpayKey = (req, res) => {
    res.json({
        success: true,
        key: process.env.RAZORPAY_KEY_ID
    });
};

// @desc    Create a Razorpay Order
// @route   POST /api/payment/create-order
// @access  Public (User Token optional)
const createOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt, notes } = req.body;

        if (!amount) {
            return res.status(400).json({ success: false, message: 'Amount is required' });
        }

        const options = {
            amount: Math.round(amount * 100), // Razorpay expects amount in paise
            currency,
            receipt: receipt || `receipt_${Date.now()}`,
            notes: notes || {}
        };

        const order = await razorpay.orders.create(options);

        res.status(201).json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt,
                status: order.status
            },
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Razorpay Create Order Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify Razorpay Payment Signature
// @route   POST /api/payment/verify
// @access  Public
const verifyPayment = (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
            });
        }

        // Generate expected signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            res.json({
                success: true,
                message: 'Payment verified successfully',
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment verification failed. Invalid signature.'
            });
        }
    } catch (error) {
        console.error('Razorpay Verify Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Fetch Payment Details from Razorpay
// @route   GET /api/payment/:paymentId
// @access  Public
const getPaymentDetails = async (req, res) => {
    try {
        const payment = await razorpay.payments.fetch(req.params.paymentId);
        res.json({
            success: true,
            payment: {
                id: payment.id,
                amount: payment.amount / 100, // Convert paise to INR
                currency: payment.currency,
                status: payment.status,
                method: payment.method,
                email: payment.email,
                contact: payment.contact,
                description: payment.description,
                created_at: payment.created_at
            }
        });
    } catch (error) {
        console.error('Razorpay Fetch Payment Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getRazorpayKey,
    createOrder,
    verifyPayment,
    getPaymentDetails
};
