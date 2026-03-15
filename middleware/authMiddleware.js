const jwt = require('jsonwebtoken');
const Shop = require('../models/Shop');
const Admin = require('../models/Admin');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.shop = await Shop.findById(decoded.id).select('-password');
            if (!req.shop) {
                return res.status(401).json({ message: 'Not authorized, shop not found' });
            }
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const protectAdmin = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.admin = await Admin.findById(decoded.id).select('-password');
            if (!req.admin) {
                return res.status(401).json({ message: 'Not authorized, admin not found' });
            }
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const protectUser = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const protectAdminOrShop = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 1. Try Shop lookup
            const shop = await Shop.findById(decoded.id).select("-password");
            if (shop) {
                req.shop = shop;
                return next();
            }

            // 2. Try Admin lookup
            const admin = await Admin.findById(decoded.id).select("-password");
            if (admin) {
                req.admin = admin;
                return next();
            }

            // 3. Fallback: Lookup failed for both
            console.warn(`Auth Warning: ID ${decoded.id} not found in Shop or Admin collections`);
            return res.status(401).json({ message: "Not authorized: account lookup failed" });

        } catch (error) {
            console.error("Auth Middleware Error:", error.message);
            return res.status(401).json({ message: "Not authorized: session expired or invalid" });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized: no session token found" });
    }
};

const protectAny = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 1. Try Shop
            const shop = await Shop.findById(decoded.id).select("-password");
            if (shop) {
                req.shop = shop;
                return next();
            }

            // 2. Try Admin
            const admin = await Admin.findById(decoded.id).select("-password");
            if (admin) {
                req.admin = admin;
                return next();
            }

            // 3. Try User
            const user = await User.findById(decoded.id).select("-password");
            if (user) {
                req.user = user;
                return next();
            }

            return res.status(401).json({ message: "Not authorized: account lookup failed" });

        } catch (error) {
            console.error("Auth Middleware Error:", error.message);
            return res.status(401).json({ message: "Not authorized: session expired or invalid" });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized: no token found" });
    }
};

module.exports = { protect, protectAdmin, protectUser, protectAdminOrShop, protectAny };
