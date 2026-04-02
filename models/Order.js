// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for guest checkouts
  },
  customerInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    pincode: String
  },
  items: [{
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  subtotal: {
    type: Number,
    required: true
  },
  shipping: {
    type: Number,
    default: 50
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'razorpay'],
    default: 'cod'
  },
  paymentId: String,
  razorpayOrderId: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'confirmed'
  }
}, {
  timestamps: true // Automatically creates createdAt and updatedAt
});

// ✅ Indexes for performance optimization
orderSchema.index({ orderId: 1 }, { unique: true }); // Fast order lookups
orderSchema.index({ userId: 1, createdAt: -1 }); // User order history
orderSchema.index({ 'customerInfo.email': 1 }); // Guest order tracking
orderSchema.index({ orderStatus: 1, createdAt: -1 }); // Admin dashboard queries
orderSchema.index({ createdAt: -1 }); // Recent orders

module.exports = mongoose.model('Order', orderSchema);
