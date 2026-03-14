const Cart = require('../models/Cart');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private (User)
const getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.user._id }).populate('items.product');
        if (!cart) {
            cart = await Cart.create({ userId: req.user._id, items: [] });
            return res.json({ success: true, cart, totalAmount: 0 });
        }

        let totalAmount = 0;
        const itemsWithSubtotal = cart.items.map(item => {
            const subtotal = (item.product.sellingPrice || 0) * item.quantity;
            totalAmount += subtotal;
            return {
                ...item._doc,
                subtotal
            };
        });

        res.json({ 
            success: true, 
            cart: { ...cart._doc, items: itemsWithSubtotal },
            totalAmount 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private (User)
const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        let cart = await Cart.findOne({ userId: req.user._id });

        if (!cart) {
            cart = await Cart.create({
                userId: req.user._id,
                items: [{ product: productId, quantity: quantity || 1 }]
            });
        } else {
            const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += (quantity || 1);
            } else {
                cart.items.push({ product: productId, quantity: quantity || 1 });
            }
            await cart.save();
        }

        const populatedCart = await Cart.findById(cart._id).populate('items.product');
        
        let totalAmount = 0;
        const itemsWithSubtotal = populatedCart.items.map(item => {
            const subtotal = (item.product.sellingPrice || 0) * item.quantity;
            totalAmount += subtotal;
            return {
                ...item._doc,
                subtotal
            };
        });

        res.json({ 
            success: true, 
            message: 'Item added to cart', 
            cart: { ...populatedCart._doc, items: itemsWithSubtotal },
            totalAmount
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:productId
// @access  Private (User)
const updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        const cart = await Cart.findOne({ userId: req.user._id });

        if (cart) {
            const itemIndex = cart.items.findIndex(item => item.product.toString() === req.params.productId);
            if (itemIndex > -1) {
                cart.items[itemIndex].quantity = quantity;
                await cart.save();
                const populatedCart = await Cart.findById(cart._id).populate('items.product');
                
                let totalAmount = 0;
                const itemsWithSubtotal = populatedCart.items.map(item => {
                    const subtotal = (item.product.sellingPrice || 0) * item.quantity;
                    totalAmount += subtotal;
                    return {
                        ...item._doc,
                        subtotal
                    };
                });

                return res.json({ 
                    success: true, 
                    message: 'Cart updated', 
                    cart: { ...populatedCart._doc, items: itemsWithSubtotal },
                    totalAmount
                });
            }
        }
        res.status(404).json({ success: false, message: 'Item not found in cart' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private (User)
const removeFromCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user._id });
        if (cart) {
            cart.items = cart.items.filter(item => item.product.toString() !== req.params.productId);
            await cart.save();
            const populatedCart = await Cart.findById(cart._id).populate('items.product');
            return res.json({ success: true, message: 'Item removed from cart', cart: populatedCart });
        }
        res.status(404).json({ success: false, message: 'Cart not found' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private (User)
const clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user._id });
        if (cart) {
            cart.items = [];
            await cart.save();
            return res.json({ success: true, message: 'Cart cleared', cart });
        }
        res.status(404).json({ success: false, message: 'Cart not found' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
};
