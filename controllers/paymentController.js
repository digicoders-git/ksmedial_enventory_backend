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
// @access  Public (but userId required)
const createOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt, notes, userId, orderId } = req.body;

        if (!amount) {
            return res.status(400).json({ success: false, message: 'Amount is required' });
        }

        // Validate userId - either from token or body
        let finalUserId = userId;
        if (req.user) {
            finalUserId = req.user._id; // From token if logged in
        } else if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'userId is required for payment tracking. Please login or provide userId in request body.' 
            });
        }

        const options = {
            amount: Math.round(amount * 100), // Razorpay expects amount in paise
            currency,
            receipt: receipt || `receipt_${Date.now()}`,
            notes: {
                ...notes,
                userId: finalUserId.toString(),
                orderId: orderId || 'N/A',
                createdAt: new Date().toISOString()
            }
        };

        const order = await razorpay.orders.create(options);

        res.status(201).json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt,
                status: order.status,
                notes: order.notes
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
// @access  Public (but userId required for tracking)
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, orderId } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
            });
        }

        // Validate userId for tracking
        let finalUserId = userId;
        if (req.user) {
            finalUserId = req.user._id;
        } else if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'userId is required for payment tracking' 
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
            // TODO: Save payment record to database with userId and orderId
            // Example: await Payment.create({ userId: finalUserId, orderId, razorpay_payment_id, razorpay_order_id, status: 'success' });
            
            res.json({
                success: true,
                message: 'Payment verified successfully',
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                userId: finalUserId,
                verifiedAt: new Date().toISOString()
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
        const paymentId = req.params.paymentId;
        
        // Check if it's a test payment ID
        if (paymentId.startsWith('pay_TEST')) {
            return res.status(400).json({
                success: false,
                message: 'This is a test payment ID. This endpoint only works with real Razorpay payment IDs from actual transactions.',
                note: 'Test payment IDs are only for signature verification, not for fetching payment details.'
            });
        }
        
        const payment = await razorpay.payments.fetch(paymentId);
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
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to fetch payment details',
            hint: 'Make sure the payment ID is valid and exists in Razorpay dashboard'
        });
    }
};

// @desc    Generate Test Payment Data (FOR TESTING ONLY)
// @route   POST /api/payment/generate-test-data
// @access  Public
const generateTestData = (req, res) => {
    try {
        const { razorpay_order_id } = req.body;

        if (!razorpay_order_id) {
            return res.status(400).json({
                success: false,
                message: 'razorpay_order_id is required. First call create-order API to get order_id'
            });
        }

        // Generate mock payment ID
        const razorpay_payment_id = `pay_TEST${Date.now()}`;

        // Generate valid signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const razorpay_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        res.json({
            success: true,
            message: 'Test data generated. Use this in verify API',
            testData: {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            },
            instructions: {
                step1: 'Copy the testData object',
                step2: 'Use it in POST /api/payment/verify endpoint',
                step3: 'Verification should succeed with this data'
            }
        });
    } catch (error) {
        console.error('Generate Test Data Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getRazorpayKey,
    createOrder,
    verifyPayment,
    getPaymentDetails,
    generateTestData
};
