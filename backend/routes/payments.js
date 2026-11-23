const router = require('express').Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('Razorpay API keys are not configured');
  }
  return new Razorpay({ key_id, key_secret });
}

// POST /api/payments/create-order
router.post('/create-order', requireAuth, async (req, res, next) => {
  try {
    const razorpay = getRazorpay();
    const amountInRupees = Number(req.body?.amount) || 999; // Default ₹999 Pro Plan
    const order = await razorpay.orders.create({
      amount: Math.round(amountInRupees * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        userId: String(req.user._id || req.user.id),
        plan: req.body?.plan || 'contractor_pro',
      },
    });

    return res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/verify
router.post('/verify', requireAuth, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Mark user/contractor as upgraded in MongoDB
    await User.findByIdAndUpdate(req.user._id || req.user.id, {
      $set: { plan: 'pro', lastPaymentId: razorpay_payment_id },
    });

    return res.json({
      success: true,
      message: 'Payment verified and Pro Compliance Plan activated',
      paymentId: razorpay_payment_id,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;