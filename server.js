const express = require('express');
const session = require('express-session');
const path = require('path');
const connectDB = require('./config/database');
const User = require('./models/User');
const redisClient = require("./config/redis");
(async () => {
  try {
    await redisClient.set("redis:test", "BloomHub");
    console.log('✅ Redis connected');
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
    // Do not crash, optionally: process.exit(1);
  }
})();




const Order = require('./models/Order');
// Add after your existing imports
const http = require('http');
const WebSocket = require('ws');


const { generateToken } = require('./utils/jwt');
const { authenticateToken } = require('./middleware/auth');


require('dotenv').config();


const Razorpay = require('razorpay');
const crypto = require('crypto');

console.log('=== ENVIRONMENT CHECK ===');
console.log('RAZORPAY_KEY_ID exists:', !!process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);
console.log('Key ID starts with:', process.env.RAZORPAY_KEY_ID?.substring(0, 10));
console.log('========================');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const app = express();

// Connect to MongoDB
connectDB();

// Set view engine
app.set('view engine', 'ejs');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration for cart
app.use(session({
  secret: process.env.SESSION_SECRET || 'bloomhub-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});


// Initialize cart in session
app.use((req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  next();
});



// Existing routes
app.get('/', (req, res) => {
  res.render('home'); 
});

// ==================== PLANTS API (REDIS DEMO) ====================
app.get("/api/plants", async (req, res) => {
  try {
    const cacheKey = "plants:all";

    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      console.log("⚡ WEBSITE → Redis cache HIT");
      return res.json(JSON.parse(cachedData));
    }

    console.log("🗄️ WEBSITE → Redis cache MISS");

    const plants = [
      { name: "Rose", price: 199 },
      { name: "Tulsi", price: 149 },
      { name: "Aloe Vera", price: 99 }
    ];

    await redisClient.setEx(cacheKey, 60, JSON.stringify(plants));

    res.json(plants);
  } catch (err) {
    console.error("Redis error:", err);
    res.status(500).json({ error: "Redis failed" });
  }
});
// ===============================================================


app.get("/categories", (req, res) => {
  res.render("categories");
});

// ==================== STATIC PAGE CACHING ====================

app.get("/indoor", async (req, res) => {
  const cacheKey = "page:indoor";

  try {
    const cachedPage = await redisClient.get(cacheKey);
    if (cachedPage) {
      console.log("⚡ INDOOR page served from Redis");
      return res.send(cachedPage);
    }

    console.log("🗄️ INDOOR page rendered & cached");

    res.render("indoor", {}, async (err, html) => {
      if (err) return res.status(500).send("Render error");

      await redisClient.setEx(cacheKey, 300, html); // 5 min TTL
      res.send(html);
    });

  } catch (err) {
    console.error(err);
    res.render("indoor");
  }
});

app.get("/outdoor", async (req, res) => {
  const cacheKey = "page:outdoor";

  try {
    const cachedPage = await redisClient.get(cacheKey);
    if (cachedPage) {
      console.log("⚡ OUTDOOR page served from Redis");
      return res.send(cachedPage);
    }

    console.log("🗄️ OUTDOOR page rendered & cached");

    res.render("outdoor", {}, async (err, html) => {
      if (err) return res.status(500).send("Render error");

      await redisClient.setEx(cacheKey, 300, html); // 5 min TTL
      res.send(html);
    });

  } catch (err) {
    console.error(err);
    res.render("outdoor");
  }
});

// =============================================================

app.get('/fiddle', (req, res) => {
  res.render('fiddle'); 
});

app.get("/blog", (req, res) => {
  res.render("blog");
});

app.get('/contact', (req, res) => {
  res.render('contact');
});

app.post('/contact', (req, res) => {
  console.log(req.body);
  res.send("Message received! We'll get back to you soon.");
});

// Cart Routes
app.get('/cart', (req, res) => {
  const cartItems = req.session.cart || [];
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  res.render('cart', { cartItems, total });
});

app.post('/add-to-cart', (req, res) => {
  const { name, price, image } = req.body;
  const cart = req.session.cart || [];

  // Check if item already exists in cart
  const existingItemIndex = cart.findIndex(item => item.name === name);

  if (existingItemIndex > -1) {
    // Increase quantity if item exists
    cart[existingItemIndex].quantity += 1;
  } else {
    // Add new item to cart
    cart.push({
      name: name,
      price: parseFloat(price),
      image: image,
      quantity: 1
    });
  }

  req.session.cart = cart;
  res.json({ success: true, cartCount: cart.length });
});

app.post('/update-cart-quantity', (req, res) => {
  const { itemName, quantity } = req.body;
  const cart = req.session.cart || [];

  const itemIndex = cart.findIndex(item => item.name === itemName);
  if (itemIndex > -1) {
    if (quantity > 0) {
      cart[itemIndex].quantity = parseInt(quantity);
    } else {
      cart.splice(itemIndex, 1); // Remove item if quantity is 0
    }
  }

  req.session.cart = cart;
  res.json({ success: true });
});

app.post('/remove-from-cart', (req, res) => {
  const { itemName } = req.body;
  const cart = req.session.cart || [];

  const itemIndex = cart.findIndex(item => item.name === itemName);
  if (itemIndex > -1) {
    cart.splice(itemIndex, 1);
  }

  req.session.cart = cart;
  res.json({ success: true });
});

// Checkout routes
app.get('/checkout', (req, res) => {
  const cartItems = req.session.cart || [];
  if (cartItems.length === 0) {
    return res.redirect('/cart');
  }
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  res.render('checkout', { cartItems, total });
});

// ==================== RAZORPAY INTEGRATION ROUTES ====================

// Create Razorpay Order
app.post('/create-razorpay-order', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, city, state, pincode } = req.body;
    
    // Calculate total amount from cart
    const cartItems = req.session.cart || [];
    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const shipping = subtotal > 999 ? 0 : 50;
    const total = subtotal + shipping;
    
    // Create order
    const options = {
      amount: Math.round(total * 100), // Amount in paisa (₹1 = 100 paisa)
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    
    console.log('Razorpay order created:', order.id);
    
    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
});

// Verify Payment
app.post('/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      pincode
    } = req.body;

    // Log the key being used
    console.log('Using Razorpay Key:', process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_') ? 'TEST' : 'LIVE');

    // Ensure required fields exist
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment details'
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('Invalid signature:', {
        generatedSignature,
        razorpay_signature
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Payment verified
    const cartItems = req.session.cart || [];
    if (!cartItems.length) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 999 ? 0 : 50;
    const total = subtotal + shipping;

    const order = {
      orderId: `BH${Date.now()}`,
      customerInfo: { firstName, lastName, email, phone, address, city, state, pincode },
      items: cartItems,
      subtotal,
      shipping,
      total,
      paymentMethod: 'razorpay',
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      paymentStatus: 'completed',
      orderStatus: 'confirmed'
    };

    const savedOrder = await Order.create(order);
    console.log('✅ Order saved to database:', savedOrder.orderId);


    
    // ✅ NEW: Broadcast real-time notification
global.broadcastToAll({
  type: 'NEW_ORDER',
  orderId: order.orderId,
  total: order.total,
  customerName: `${firstName} ${lastName}`,
  timestamp: new Date().toISOString()
});

    // Clear cart after successful payment
    req.session.cart = [];

    res.json({
      success: true,
      message: 'Payment verified and order created',
      orderId: order.orderId
    });

  } catch (error) {
    console.error('Error in /verify-payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed. Please try again.'
    });
  }
});


// Process COD Orders (Updated from your existing route)
app.post('/process-checkout', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      paymentMethod
    } = req.body;

    // Get cart items and calculate total
    const cartItems = req.session.cart || [];
    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 999 ? 0 : 50;
    const total = subtotal + shipping;

    // Create order object
    const order = {
      orderId: `BH${Date.now()}`,
      customerInfo: { firstName, lastName, email, phone, address, city, state, pincode },
      items: cartItems,
      subtotal,
      shipping,
      total,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'completed',
      orderStatus: 'confirmed'
    };

   // ✅ REPLACE "TODO: Save to database" with this:
const savedOrder = await Order.create(order);
console.log('✅ COD Order saved to database:', savedOrder.orderId);

// ✅ NEW: Broadcast real-time notification
global.broadcastToAll({
  type: 'NEW_ORDER',
  orderId: order.orderId,
  total: order.total,
  customerName: `${firstName} ${lastName}`,
  paymentMethod: 'COD',
  timestamp: new Date().toISOString()
});

    // Clear cart after successful order
    req.session.cart = [];

    // TODO: Send confirmation email
    // await sendOrderConfirmationEmail(order);

    // Check if request expects JSON response (from new frontend) or HTML (from old frontend)
    const acceptsJSON = req.headers['content-type'] === 'application/json';
    
    if (acceptsJSON) {
      res.json({
        success: true,
        message: 'COD order created successfully',
        orderId: order.orderId
      });
    } else {
      // For backward compatibility with existing form submission
      res.send(`
        <div style="text-align: center; padding: 50px; font-family: Arial;">
          <h1 style="color: #4a7c59;">Order Placed Successfully!</h1>
          <p>Order ID: ${order.orderId}</p>
          <p>Thank you for your order. We'll send you a confirmation email shortly.</p>
          <a href="/" style="background: #4a7c59; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Continue Shopping</a>
        </div>
      `);
    }

  } catch (error) {
    console.error('Error processing COD order:', error);
    
    const acceptsJSON = req.headers['content-type'] === 'application/json';
    
    if (acceptsJSON) {
      res.status(500).json({
        success: false,
        message: 'Failed to process order'
      });
    } else {
      res.status(500).send(`
        <div style="text-align: center; padding: 50px; font-family: Arial;">
          <h1 style="color: #dc3545;">Order Failed!</h1>
          <p>Something went wrong. Please try again.</p>
          <a href="/checkout" style="background: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Try Again</a>
        </div>
      `);
    }
  }
});

// Order Confirmation Page
app.get('/order-confirmation/:orderId', (req, res) => {
  const { orderId } = req.params;
  
  // TODO: Fetch order details from database
  // const order = await Order.findOne({ orderId });
  
  res.send(`
    <div style="text-align: center; padding: 50px; font-family: Arial;">
      <h1 style="color: #4a7c59;">Order Confirmed!</h1>
      <h2>Order ID: ${orderId}</h2>
      <p>Thank you for your purchase. Your order has been confirmed and will be processed shortly.</p>
      <p>You will receive an email confirmation with order details.</p>
      <a href="/" style="background: #4a7c59; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Continue Shopping</a>
    </div>
  `);
});

// ==================== END RAZORPAY INTEGRATION ====================

// Authentication routes
app.get('/login', (req, res) => {
  res.render('login'); 
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render('login', { 
        error: 'Please provide both email and password' 
      });
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(400).render('login', { 
        error: 'Invalid email or password' 
      });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(400).render('login', { 
        error: 'Invalid email or password' 
      });
    }

    // ✅ NEW: Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email
    });

     // Store user in session (for cart and backward compatibility)
     req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      token: token // Store token in session
    };

    console.log('Login successful for:', user.email);
    console.log('JWT Token generated:', token.substring(0, 30) + '...');

    res.redirect('/');
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('login', { 
      error: 'Server error. Please try again.' 
    });
  }
});


app.get('/signup', (req, res) => {
  res.render('signup'); 
});
app.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).send("Server error during logout");
      }
      res.redirect('/'); // Redirects to home page
    });
  } else {
    res.redirect('/');
  }
});



app.post('/signup', async (req, res) => {
  try {
    const { name, email, password, 'confirm-password': confirmPassword } = req.body;

    // Validate input
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).render('signup', { 
        error: 'Please fill in all fields' 
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).render('signup', { 
        error: 'Passwords do not match' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).render('signup', { 
        error: 'User with this email already exists' 
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password
    });

    await user.save();

     // ✅ NEW: Generate JWT token
     const token = generateToken({
      userId: user._id.toString(),
      email: user.email
    });
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      token: token // Store token in session too
    };
    
    console.log('User registered successfully:', user.email);
    console.log('JWT Token generated:', token.substring(0, 30) + '...');

    res.redirect('/login'); // Redirect to login page after successful signup
    
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).render('signup', { 
        error: messages.join('. ') 
      });
    }
    
    res.status(500).render('signup', { 
      error: 'Server error. Please try again.' 
    });
  }
});

// ==================== API AUTHENTICATION ENDPOINTS ====================
// These endpoints return JSON responses with JWT tokens for API clients

// API Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email
    });

    console.log('API Login successful for:', user.email);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        token: token
      }
    });
    
  } catch (error) {
    console.error('API Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

// API Signup Endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all fields'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const user = new User({ name, email, password });
    await user.save();
    
    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email
    });

    console.log('API Signup successful for:', user.email);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        token: token
      }
    });
    
  } catch (error) {
    console.error('API Signup error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

// ==================== END API AUTHENTICATION ====================

// ==================== PROTECTED ROUTE TEST ====================
// Test endpoint to verify JWT authentication
app.get('/api/protected/profile', authenticateToken, async (req, res) => {
  try {
    // req.user is populated by authenticateToken middleware
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Protected route accessed successfully',
      data: {
        userId: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Protected route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
// ==================== END PROTECTED ROUTE ====================


// ==================== WEBSOCKET SETUP ====================

// Create HTTP server from Express app
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket client connected');

  // Generate unique client ID
  const clientId = Date.now().toString();
  clients.set(clientId, ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    message: 'Welcome to BloomHub Real-Time Updates',
    clientId: clientId
  }));

  // Handle incoming messages from clients
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received:', message);

      // Handle different message types
      switch (message.type) {
        case 'PING':
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          break;
        
        case 'SUBSCRIBE_ORDER':
          // Client wants to track a specific order
          ws.orderId = message.orderId;
          console.log(`👁️ Client subscribed to order: ${message.orderId}`);
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    clients.delete(clientId);
    console.log('❌ WebSocket client disconnected');
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Helper function to broadcast to all connected clients
function broadcastToAll(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Helper function to send to specific order subscribers
function notifyOrderSubscribers(orderId, data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.orderId === orderId) {
      client.send(message);
    }
  });
}

// Make broadcast functions available globally
global.broadcastToAll = broadcastToAll;
global.notifyOrderSubscribers = notifyOrderSubscribers;

// ==================== END WEBSOCKET SETUP ====================

// Start server (REPLACE your old app.listen())
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}`);
});
